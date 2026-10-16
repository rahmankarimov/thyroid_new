const { Client, CopyConditions } = require('minio');

const minioClient = new Client({
    endPoint: 'localhost',
    port: 9000,
    useSSL: false,
    accessKey: 'minio',
    secretKey: process.env.MINIO_ROOT_PASSWORD || 'minio12345'
});

async function main() {
    console.log("Fixing metadata...");
    const stream = minioClient.listObjectsV2('medical-imaging', 'dataset/', true);
    let count = 0;
    for await (const obj of stream) {
        const conds = new CopyConditions();
        const ext = obj.name.endsWith('.png') ? 'image/png' : 'image/jpeg';
        
        // S3 copy object to itself to replace metadata
        // Actually Minio API for copyObject: (bucketName, objectName, sourceObject, conditions, metaData)
        // Wait, copyObject is (bucketName, objectName, sourceObject, conds, metaData)
        const sourcePath = '/medical-imaging/' + obj.name;
        
        try {
            await minioClient.copyObject('medical-imaging', obj.name, sourcePath, conds, {
                'Content-Type': ext
            });
            count++;
            if (count % 500 === 0) console.log("Fixed " + count);
        } catch(e) {
            console.error(e);
        }
    }
    console.log("Done! Fixed " + count + " objects.");
}

main().catch(console.error);