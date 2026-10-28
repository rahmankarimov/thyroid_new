const fs = require('fs');
const path = require('path');
const { Client } = require('minio');
const { Client: PgClient } = require('pg');
const { v4: uuidv4 } = require('uuid');

// Load .env from thyroai-platform if present
const envFile = path.resolve(__dirname, '../../.env');
if (fs.existsSync(envFile)) {
    for (const line of fs.readFileSync(envFile, 'utf-8').split(/\r?\n/)) {
        const match = line.match(/^([A-Z0-9_]+)=(.*)$/);
        if (match && !process.env[match[1]]) {
            process.env[match[1]] = match[2].trim();
        }
    }
}

const minioPort = parseInt(process.env.MINIO_API_PORT || '9000', 10);
const minioClient = new Client({
    endPoint: 'localhost',
    port: minioPort,
    useSSL: false,
    accessKey: process.env.MINIO_ROOT_USER || 'minio',
    secretKey: process.env.MINIO_ROOT_PASSWORD || 'minio12345'
});
const bucketName = process.env.MINIO_BUCKET || 'medical-imaging';

const pgClient = new PgClient({
    user: process.env.POSTGRES_USER || 'postgres',
    host: 'localhost',
    database: 'thyroaidb',
    password: process.env.POSTGRES_PASSWORD || 'thyroai_dev_pass',
    port: parseInt(process.env.POSTGRES_PORT || '5432', 10),
});

const IMAGES_DIR = path.resolve(__dirname, '../../..');
const BBOX_DIR = path.join(IMAGES_DIR, 'bbox_labels');

async function main() {
    await pgClient.connect();
    console.log('Connected to PostgreSQL.');

    const exists = await minioClient.bucketExists(bucketName);
    if (!exists) {
        await minioClient.makeBucket(bucketName);
        console.log('Bucket created: ' + bucketName);
    }

    // Ensure public read policy so browser can load images directly
    const publicReadPolicy = {
        Version: '2012-10-17',
        Statement: [
            {
                Effect: 'Allow',
                Principal: { AWS: ['*'] },
                Action: ['s3:GetObject'],
                Resource: [`arn:aws:s3:::${bucketName}/*`]
            }
        ]
    };
    await minioClient.setBucketPolicy(bucketName, JSON.stringify(publicReadPolicy));

    const categories = ['malignant', 'benign'];
    let count = 0;

    for (const cat of categories) {
        const catDir = path.join(IMAGES_DIR, cat);
        if (!fs.existsSync(catDir)) continue;

        const files = fs.readdirSync(catDir).filter(f => f.endsWith('.png') || f.endsWith('.jpg'));
        
        for (const file of files) {
            const ext = path.extname(file);
            const baseName = path.basename(file, ext);
            
            const imagePath = path.join(catDir, file);
            const bboxPath = path.join(BBOX_DIR, baseName + '.txt');

            const minioObjectName = 'dataset/' + cat + '/' + baseName + '-' + Date.now() + ext;
            const fileStream = fs.createReadStream(imagePath);
            const contentType = ext.toLowerCase() === '.png' ? 'image/png' : 'image/jpeg';
            await minioClient.putObject(bucketName, minioObjectName, fileStream, undefined, {
                'Content-Type': contentType
            });
            const minioUrl = `http://localhost:${minioPort}/${bucketName}/${minioObjectName}`;

            let bboxData = null;
            if (fs.existsSync(bboxPath)) {
                const txtContent = fs.readFileSync(bboxPath, 'utf-8');
                bboxData = JSON.stringify({ raw_bbox: txtContent.trim() }); 
            }

            const patientId = uuidv4();
            const examId = uuidv4();
            const seriesId = uuidv4();
            const finStr = Math.floor(100000 + Math.random() * 900000).toString(); // 6 digits

            try {
                await pgClient.query('BEGIN');

                await pgClient.query(
                    'INSERT INTO patients (id, first_name, last_name, fin, gender) VALUES ($1, $2, $3, $4, $5)',
                    [patientId, 'Dataset', baseName, finStr, 'UNKNOWN']
                );

                await pgClient.query(
                    'INSERT INTO examinations (id, patient_id, examination_date, status) VALUES ($1, $2, CURRENT_DATE, $3)',
                    [examId, patientId, 'PENDING_REVIEW']
                );

                // No dicom_instances, use image_series with full_url
                await pgClient.query(
                    'INSERT INTO image_series (id, examination_id, label, full_url) VALUES ($1, $2, $3, $4)',
                    [seriesId, examId, 'Ultrasound View', minioUrl]
                );

                const pathologyId = uuidv4();
                await pgClient.query(
                    'INSERT INTO pathology_results (id, examination_id, diagnosis) VALUES ($1, $2, $3)',
                    [pathologyId, examId, cat === 'malignant' ? 'Malignant' : 'Benign']
                );

                if (bboxData) {
                    const annotationId = uuidv4();
                    await pgClient.query(
                        'INSERT INTO annotations (id, image_series_id, patient_id, path, comment, color, shared) VALUES ($1, $2, $3, $4, $5, $6, $7)',
                        [annotationId, seriesId, patientId, bboxData, 'Ground Truth BBox', '#ef4444', true]
                    );
                }

                await pgClient.query('COMMIT');
                count++;
                if (count % 100 === 0) {
                    console.log('Processed ' + count + ' images...');
                }
            } catch (err) {
                await pgClient.query('ROLLBACK');
                console.error('Error inserting ' + baseName + ':', err);
            }
        }
    }

    await pgClient.end();
    console.log('Finished bulk upload. Total processed: ' + count);
}

main().catch(console.error);