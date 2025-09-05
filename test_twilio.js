import twilio from 'twilio';
import dotenv from 'dotenv';

dotenv.config();

// Load credentials from .env
const accountSid = process.env.TWILIO_ACCOUNT_SID;
const authToken = process.env.TWILIO_AUTH_TOKEN;
const twilioPhoneNumber = process.env.TWILIO_PHONE_NUMBER;

const client = twilio(accountSid, authToken);

async function sendTestSMS() {
  try {
    const message = await client.messages.create({
      body: "🚨 Test message from your safety app backend.",
      from: twilioPhoneNumber,   // must be your Twilio number
      to: "+91XXXXXXXXXX"        // put your own phone number here (with country code)
    });

    console.log("✅ Message sent successfully. SID:", message.sid);
  } catch (err) {
    console.error("❌ Failed to send SMS:", err);
  }
}

sendTestSMS();