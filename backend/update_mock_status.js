import mongoose from 'mongoose';
import dotenv from 'dotenv';
dotenv.config();

const CustomerSchema = new mongoose.Schema({}, { strict: false, collection: 'customers' });
const Customer = mongoose.model("Customer", CustomerSchema);

async function run() {
    try {
        await mongoose.connect(process.env.MONGODB_URI);
        const res = await Customer.updateMany(
            { name: "Mock Customer for UI Check (Risen)" },
            { $set: { 
                productionStatus: "รอยืนยัน",
                "orderedProducts.0.productionStatus": "รอยืนยัน"
            } }
        );
        console.log("Updated mock customer status:", res);
    } catch (e) {
        console.error(e);
    } finally {
        await mongoose.disconnect();
    }
}
run();
