const { Client } = require('minio');

const minioClient = new Client({
    endPoint: 'localhost',
    port: 9000,
    useSSL: false,
    accessKey: 'minio',
    secretKey: process.env.MINIO_ROOT_PASSWORD || 'minio12345'
});

async function main() {
    console.log("Fixing metadata using putObject overwrite...");
    const stream = minioClient.listObjectsV2('medical-imaging', 'dataset/', true);
    let count = 0;
    
    // We process sequentially, but let's do batches to speed it up.
    // Actually Minio API handles streams nicely.
    for await (const obj of stream) {
        if (!obj.name.endsWith('.jpg') && !obj.name.endsWith('.png')) continue;
        
        try {
            const ext = obj.name.endsWith('.png') ? 'image/png' : 'image/jpeg';
            // Get object stream
            const dataStream = await minioClient.getObject('medical-imaging', obj.name);
            
            // Put it back with correct content type
            await minioClient.putObject('medical-imaging', obj.name, dataStream, obj.size, {
                'Content-Type': ext
            });
            
            count++;
            if (count % 250 === 0) console.log("Fixed " + count);
        } catch(e) {
            console.error("Error on " + obj.name + ":", e.message);
        }
    }
    console.log("Done! Fixed " + count + " objects.");
}

main().catch(console.error);