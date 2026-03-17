// src/app/api/v1/word-clouds/route.ts
const wordCloudsWithWords = await Promise.all(
  wordCloudsList.map(async (cloud) => {
    const words = await db.select()...  // N+1 query!
  })
);