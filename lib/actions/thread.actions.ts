'use server'
import User from "../models/user.model";
import Thread from "../models/thread.model";
import { connectToDB } from "../mongoose"
import { revalidatePath } from "next/cache";

interface Params {
    text: string,
    author: string,
    communityId: string | null,
    path: string
}
export async function createThread({ text, author, communityId, path }: Params) {
    try {
        connectToDB();
        const createdThread = await Thread.create({
            text,
            author,
            communityId: null,
            path
        });

        // Update User Model

        await User.findByIdAndUpdate(author, {
            $push: { threads: createdThread._id },
        });

        revalidatePath(path);
    } catch (error: any) {
        throw new Error(`Error Creating Thread: ${error.message}`)
    }
};

export async function fetchPosts(pageNumber = 1, pagesize = 20) {
    connectToDB();
    // Calculate the number of posts skip 
    const skipAmount = (pageNumber - 1) * pagesize
    const postsQuery = Thread.find({ parentId: { $in: [null, undefined] } })
        .sort({ createdAt: 'desc' })
        .skip(skipAmount)
        .limit(pagesize)
        .populate({ path: 'author', model: User })
        .populate({
            path: 'children',
            populate: {
                path: 'author',
                model: User,
                select: "_id name parentId image"
            }
        });
    const totalPostsCount = await Thread.countDocuments({ parentId: { $in: [null, undefined] } });
    const posts = await postsQuery.exec();
    const isNext = totalPostsCount > skipAmount + posts.length;
    return { posts, isNext }
}

export async function fetchThreadById(id: string) {
    connectToDB();
    try {
        //! Populate Community 
        const thread = await Thread.findById(id)
            .populate({
                path: 'author',
                model: User,
                select: "_id id name image"
            })
            .populate({
                path: 'children',
                populate: [
                    {
                        path: 'author',
                        model: User,
                        select: "_id id name parentId image"
                    }, {
                        path: 'children',
                        model: Thread,
                        populate: {
                            path: 'author',
                            model: User,
                            select: "_id id name parentId image"
                        }
                    }
                ]
            }).exec();
        return thread;
    } catch (error: any) {
        throw new Error(`Error Fetching thread:${error.message}`)
    }
}

export async function addCommentToThread(
    threadId: string,
    commentText: string,
    userId: string,
    path: string
) {
    connectToDB();
    try {
        const orignalThread = await Thread.findById(threadId);
        if (!orignalThread) {
            throw new Error('Thread Not Found');
        }
        //#  Create a new thread with comment text
        const commentThread = new Thread({
            text: commentText,
            author: userId,
            parentId: threadId
        });
        //# Save the new thread
        const savedCommentThread = await commentThread.save();
        //# Include Comment
        orignalThread.children.push(savedCommentThread._id);
        //#Save Orignal Thread
        await orignalThread.save();
        revalidatePath(path);
    } catch (error: any) {
        throw new Error(`Error adding a comment ${error.message}`)
    }
}
