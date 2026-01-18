require('dotenv').config();
const nodemailer = require('nodemailer');

const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_APP_PASSWORD
    }
});

async function verify() {
    console.log(`Attempting to authenticate with:`);
    console.log(`User: ${process.env.EMAIL_USER}`);
    // Obfuscate password for display, showing shortness or format
    const pass = process.env.EMAIL_APP_PASSWORD || '';
    console.log(`Pass: ${pass} (Length: ${pass.length})`);

    try {
        await transporter.verify();
        console.log('✅ Server is ready to take our messages');

        console.log('Attempting to send test email...');
        const info = await transporter.sendMail({
            from: process.env.EMAIL_USER,
            to: process.env.EMAIL_USER, // Send to self
            subject: "Test Email from Script",
            text: "If you see this, sending works!"
        });
        console.log('✅ Email sent successfully!');
        console.log('Message ID:', info.messageId);
    } catch (error) {
        console.error('❌ Failed!');
        console.error('Error:', error);
    }
}

verify();
