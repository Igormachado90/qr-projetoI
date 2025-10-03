const fs = require('fs');
const path = require('path');
const QRCode = require('qrcode');

// Configurações
// Se rodar local: HOST = http://localhost:3000
// Se rodar na rede local: HOST = http://192.168.18.8:3000
// Se no Vercel: ele usaria process.env.VERCEL_URL (https://seu-site.vercel.app)
const HOST = process.env.HOST || 'http://qr-projeto-i.vercel.app';
const PUBLIC_DIR = path.join(__dirname, 'public');
const QR_CODES_DIR = path.join(__dirname, 'qrcodes');

// Garante que a pasta de QR Codes existe
if (!fs.existsSync(QR_CODES_DIR)) {
    fs.mkdirSync(QR_CODES_DIR, { recursive: true });
    console.log('📁 Pasta public/qrcodes criada');
}

// Função para detectar tipo de arquivo
function getFileType(filename) {
    const ext = path.extname(filename).toLowerCase();
    const videoExt = ['.mp4', '.webm', '.ogg', '.mov', '.avi'];
    const imageExt = ['.jpg', '.jpeg', '.png', '.gif', '.bmp'];
    const pdfExt = ['.pdf'];

    if (videoExt.includes(ext)) return 'video';
    if (imageExt.includes(ext)) return 'image';
    if (pdfExt.includes(ext)) return 'pdf';
    return 'other';
}

// Função para gerar QR Codes
async function generateQRCodes() {
    try {
        console.log('🔍 Procurando arquivos na pasta public...');

        const files = fs.readdirSync(PUBLIC_DIR)
            .filter(f => f !== 'qrcodes') // Ignora a pasta de QR Codes;

        if (files.length === 0) {
            console.log('❌ Nenhum arquivo encontrado na pasta public/');
            return;
        }

        console.log(`📄 Encontrados ${files.length} arquivos:`);
        const results = [];

        for (const file of files) {
            const fileType = getFileType(file);

            const mediaUrl = `${HOST}/media/${encodeURIComponent(file)}`;
            const qrFilename = path.basename(file, path.extname(file)) + '.png';
            const qrPath = path.join(QR_CODES_DIR, qrFilename);

            console.log(`\n🔄 Gerando QR Code para: ${file}`);
            console.log(`   📎 Tipo: ${fileType.toUpperCase()}`);
            console.log(`   🌐 URL: ${mediaUrl}`);

            try {
                await QRCode.toFile(qrPath, mediaUrl, {
                    color: {
                        dark: '#000000',
                        light: '#FFFFFF'
                    },
                    width: 300,
                    margin: 1,
                    errorCorrectionLevel: 'H'
                });

                console.log(`   ✅ QR Code salvo: ${qrFilename}`);
                results.push({
                    file: file,
                    qrCode: qrFilename,
                    url: mediaUrl,
                    type: fileType,
                    status: 'SUCESSO'
                });

            } catch (error) {
                console.log(`   ❌ Erro ao gerar QR Code: ${error.message}`);
                results.push({
                    file,
                    status: 'ERRO',
                    error: error.message
                });
            }
        }

        // Gera relatório
        console.log('\n📊 RELATÓRIO DE GERAÇÃO:');
        console.log('='.repeat(50));
        results.forEach(result => {
            if (result.status === 'SUCESSO') {
                console.log(`✅ ${result.file.padEnd(25)} [${result.type.toUpperCase().padEnd(6)}] -> ${result.qrCode}`);
            } else {
                console.log(`❌ ${result.file.padEnd(25)} -> ERRO: ${result.error}`);
            }
        });

        const successCount = results.filter(r => r.status === 'SUCESSO').length;
        const errorCount = results.filter(r => r.status === 'ERRO').length;

        console.log('='.repeat(50));
        console.log(`🎯 Total: ${results.length} | ✅ Sucessos: ${successCount} | ❌ Erros: ${errorCount}`);

    } catch (error) {
        console.error('💥 Erro geral:', error.message);
    }
}

// Executa a geração
generateQRCodes();