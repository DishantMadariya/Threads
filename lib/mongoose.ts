import mongoose, { ConnectOptions } from 'mongoose';

let isConnected = false;

export const connectToDB = async () => {
    mongoose.set('strictQuery', true);

    if (!process.env.MONGODB_URL) {
        console.log('MongoDB URL not found');
        return;
    }

    if (isConnected) {
        console.log('Already connected to MongoDB');
        return;
    }

    try {
        await mongoose.connect(process.env.MONGODB_URL, {
            serverSelectionTimeoutMS: 30000, // 30 seconds timeout
        } as ConnectOptions);
        isConnected = true;
        console.log('Connected to MongoDB');
    } catch (error) {
        console.log('Failed to connect to MongoDB', error);
    }
};
