import twilio from "twilio";
import dotenv from "dotenv";
dotenv.config();

const client = twilio(process.env.TWILIO_ACCOUNT_SID, process.env.TWILIO_AUTH_TOKEN);

(async () => {
  try {
    const msg = await client.messages.create({
      body: "Hello from Twilio test 🚀",
      from: process.env.TWILIO_PHONE_NUMBER,
      to: "+91XXXXXXXXXX"   // must be your verified number
    });
    console.log("✅ Message sent:", msg.sid);
  } catch (err) {
    console.error("❌ Error details:", err);
  }
})();
