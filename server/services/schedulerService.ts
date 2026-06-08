import cron from "node-cron";
import { Post } from "../models/Post.js";
import { Account } from "../models/Account.js";

import zernio from "../config/zernio.js";
import { ActivityLog } from "../models/ActivityLog.js";
import { platform } from "node:os";

export const initScheduler = ()=>{
    cron.schedule("* * * * *", async ()=>{
        try {
            const now = new Date();
            const postsToPublish = await Post.find({status: "scheduled", scheduledFor:
            { $lte: now }});

            for (const post of postsToPublish) {
                try{
                  const account = await Account.find({
                    user: post.user,
                    platform: {$in: post.platforms},
                    status: "connected",
                    zernioAccountId: {$exists: true}

                  })

                  if(account.length === 0){
                    console.log(`NO connected Zernio accounts found for post ${post._id}`);
                    continue;
                  }
                  const zernioPlatforms = account.map((acc)=>({
                    platform: acc.platform as any,
                    accountId: acc.zernioAccountId!
                  }))

                  const payload = {
                    content: post.content,
                    publishNow: true,
                    ...(post.mediaUrl ? {mediaItems: [{type: post.mediaType || "image", url: post.mediaUrl}]}: {}),
                    platforms: zernioPlatforms,
                  }

                  console.log(`Publishing post ${post._id} to zernio with media: ${post.mediaUrl || "none"}`)

                  const responce = await zernio.posts.createPost({
                    body: payload
                  })

                  const publishedPost = (responce.data as any)?.post || responce.data;

                  if(!publishedPost){
                    throw new Error ("Failed to get post object from zernio responce");
                  }

                  console.log(`Zernio posts created: ${publishedPost._id || publishedPost.id}`);


                   post.status = "published";
                   await post.save();

                   await ActivityLog.create({
                    user: post.user,
                    actionType: "POST_PUBLISHED",
                    description: `published post to ${account.map((a)=> a.platform).
                      join(",") }`,
                      relatedPost: post._id,

                   })


                }catch(err: any){
                  console.error(`Failed to publish post ${post._id}:`, err?.responce?.
                    data || err?.message);
                    post.status = "failed";
                    await post.save();

                }
            }

            if(postsToPublish.length > 0){
              console.log(`Evaluated ${postsToPublish.length} posts at ${now.toISOString()}`);
            }
        } catch (error) {
            console.error("Error in scheduler:", error);
        }
    })
    console.log("Scheduler service initialized.");
}
