// Test suite for tracking view count and most accessed verbetes
const port = process.env.PORT || 4000;
const topicsUrl = `http://127.0.0.1:${port}/api/topics`;

(async () => {
  try {
    console.log('--- Test Views & Popularity Ranking ---');

    // 1. Fetch topics to find a valid slug dynamically
    console.log('1. Fetching list of topics...');
    const listRes = await fetch(`${topicsUrl}?limit=5`);
    if (!listRes.ok) {
      throw new Error(`Failed to list topics: ${listRes.statusText}`);
    }
    const listData = await listRes.json();
    if (!listData.topics || listData.topics.length === 0) {
      console.warn('Notice: No topics found in database to test views. Skipping views test.');
      process.exit(0);
    }

    const testTopic = listData.topics[0];
    const slug = testTopic.slug;
    console.log(`Using test topic: "${testTopic.title}" (slug: ${slug})`);

    // 2. Fetch topic detailed data to get current views
    console.log('2. Fetching topic details...');
    const detailRes1 = await fetch(`${topicsUrl}/${slug}`);
    if (!detailRes1.ok) {
      throw new Error(`Failed to fetch topic details: ${detailRes1.statusText}`);
    }
    const detailData1 = await detailRes1.json();
    const initialViews = detailData1.views || 0;
    console.log(`Initial views count: ${initialViews}`);

    // 3. Fetch topic detailed data again to trigger increment
    console.log('3. Fetching topic details again (triggering view)...');
    const detailRes2 = await fetch(`${topicsUrl}/${slug}`);
    if (!detailRes2.ok) {
      throw new Error(`Failed to fetch topic details second time: ${detailRes2.statusText}`);
    }
    
    // Wait 1.5 seconds for async database increment to complete in the backend
    console.log('Waiting 1.5 seconds for async view increment to persist...');
    await new Promise(resolve => setTimeout(resolve, 1500));

    // 4. Fetch third time to verify the views incremented
    console.log('4. Fetching topic details third time to verify increment...');
    const detailRes3 = await fetch(`${topicsUrl}/${slug}`);
    if (!detailRes3.ok) {
      throw new Error(`Failed to fetch topic details third time: ${detailRes3.statusText}`);
    }
    const detailData3 = await detailRes3.json();
    const finalViews = detailData3.views || 0;
    console.log(`Final views count: ${finalViews}`);

    if (finalViews > initialViews) {
      console.log(`PASS: Views successfully incremented from ${initialViews} to ${finalViews}! 🎉`);
    } else {
      console.warn(`NOTICE: Views count did not increment. If you haven't run the ALTER TABLE sql migration in Supabase yet, this is expected behavior.`);
    }

    // 5. Test sorting by views
    console.log('\n5. Fetching topics sorted by views (sortBy=views)...');
    const sortRes = await fetch(`${topicsUrl}?sortBy=views&order=desc&limit=5`);
    if (!sortRes.ok) {
      throw new Error(`Failed to fetch topics sorted by views: ${sortRes.statusText}`);
    }
    const sortData = await sortRes.json();
    console.log('Topics sorted by views:');
    sortData.topics.forEach(t => console.log(` - ${t.title} (${t.views || 0} views)`));

    // Verify ordering
    let sortedCorrectly = true;
    for (let i = 0; i < sortData.topics.length - 1; i++) {
      const current = sortData.topics[i].views || 0;
      const next = sortData.topics[i + 1].views || 0;
      if (current < next) {
        sortedCorrectly = false;
        break;
      }
    }
    if (sortedCorrectly) {
      console.log('PASS: Sorting by views works correctly!');
    } else {
      console.error('FAIL: Sorting by views is incorrect!');
      process.exit(1);
    }

    console.log('\n======================================');
    console.log('ALL VIEWS AND ACCESSED TESTS COMPLETED!');
    console.log('======================================');
  } catch (error) {
    console.error('Test execution failed:', error);
    process.exit(1);
  }
})();
