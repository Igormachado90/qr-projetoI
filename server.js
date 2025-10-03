const express = require('express');
const path = require('path');
const fs = require('fs');
const QRCode = require('qrcode');

const app = express();
const PORT = process.env.PORT || 3000;
const HOST = process.env.HOST || 'http://qr-projeto-i.vercel.app';

// Configurações
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));

// Middleware
app.use('/files', express.static(path.join(__dirname, 'public')));
app.use('/qrcodes', express.static(path.join(__dirname, 'qrcodes')));

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

// Página inicial com lista de arquivos
app.get('/', async (req, res) => {
    try {
        const publicPath = path.join(__dirname, 'public');
        const files = fs.readdirSync(publicPath);
        
        const fileList = await Promise.all(
            files.map(async (file) => {
                const fileType = getFileType(file);
                const mediaUrl = `/media/${file}`;  // URL da página de mídia
                const qrCodePath = `/qrcodes/${path.basename(file, path.extname(file))}.png`;
                const fullUrl = `${HOST}${mediaUrl}`;
                
                // Verifica se o QR Code já existe
                const qrExists = fs.existsSync(path.join(__dirname, 'qrcodes', path.basename(file, path.extname(file)) + '.png'));
                
                return {
                    name: file,
                    url: `/files/${file}`,  // URL direta do arquivo
                    mediaUrl: mediaUrl,     // URL da página de mídia
                    qrCode: qrExists ? qrCodePath : null,
                    fullUrl: fullUrl,
                    type: path.extname(file).toLowerCase(),
                    fileType: fileType
                };
            })
        );
        
        res.render('index', { 
            files: fileList,
            host: HOST
        });
    } catch (error) {
        res.status(500).send('Erro ao ler arquivos: ' + error.message);
    }
});

// 🎥 NOVA ROTA: Página para exibir mídia (vídeos, imagens, PDFs)
app.get('/media/:filename', (req, res) => {
    try {
        const filename = req.params.filename;
        const filePath = path.join(__dirname, 'public', filename);
        const fileType = getFileType(filename);
        
        // Verifica se o arquivo existe
        if (!fs.existsSync(filePath)) {
            return res.status(404).render('error', { 
                message: 'Arquivo não encontrado',
                filename: filename
            });
        }
        
        const fileStats = fs.statSync(filePath);
        const fileSize = (fileStats.size / (1024 * 1024)).toFixed(2); // MB
        
        res.render('media-page', {
            filename: filename,
            fileUrl: `/files/${filename}`,
            fileType: fileType,
            fileSize: fileSize,
            host: HOST,
            title: path.basename(filename, path.extname(filename))
        });
        
    } catch (error) {
        res.status(500).render('error', { 
            message: 'Erro ao carregar arquivo',
            error: error.message
        });
    }
});

// Rota para gerar QR Code (agora aponta para a página de mídia)
app.get('/generate-qr/:filename', async (req, res) => {
    try {
        const filename = req.params.filename;
        const mediaUrl = `${HOST}/media/${filename}`;  // URL da página de mídia
        const qrFilename = path.basename(filename, path.extname(filename)) + '.png';
        const qrPath = path.join(__dirname, 'qrcodes', qrFilename);
        
        // Gera o QR Code apontando para a página de mídia
        await QRCode.toFile(qrPath, mediaUrl, {
            color: {
                dark: '#000000',
                light: '#FFFFFF'
            },
            width: 400,
            margin: 2
        });
        
        res.json({
            success: true,
            message: `QR Code gerado para ${filename}`,
            qrUrl: `/qrcodes/${qrFilename}`,
            mediaUrl: mediaUrl
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

// Rota para gerar TODOS os QR Codes
app.get('/generate-all-qr', async (req, res) => {
    try {
        const publicPath = path.join(__dirname, 'public');
        const files = fs.readdirSync(publicPath);
        const results = [];
        
        for (const file of files) {
            const mediaUrl = `${HOST}/media/${file}`;  // URL da página de mídia
            const qrFilename = path.basename(file, path.extname(file)) + '.png';
            const qrPath = path.join(__dirname, 'qrcodes', qrFilename);
            
            try {
                await QRCode.toFile(qrPath, mediaUrl);
                results.push({
                    file: file,
                    success: true,
                    qrCode: `/qrcodes/${qrFilename}`,
                    mediaUrl: mediaUrl
                });
            } catch (error) {
                results.push({
                    file: file,
                    success: false,
                    error: error.message
                });
            }
        }
        
        res.json({
            success: true,
            generated: results.filter(r => r.success).length,
            failed: results.filter(r => !r.success).length,
            results: results
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

app.listen(PORT, () => {
    console.log(`🚀 Servidor rodando em ${HOST}`);
    console.log(`📁 Acesse: ${HOST}`);
});