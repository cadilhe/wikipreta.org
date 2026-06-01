// Test suite for /api/topics sorting and filtering options
const port = process.env.PORT || 4000;
const baseUrl = `http://127.0.0.1:${port}/api/topics`;

async function fetchTopics(params) {
  const url = `${baseUrl}?${new URLSearchParams(params).toString()}`;
  console.log(`GET ${url}`);
  const res = await fetch(url);
  if (!res.ok) {
    throw new Error(`Failed to fetch topics: ${res.statusText}`);
  }
  return res.json();
}

(async () => {
  try {
    // 1. Test default list (sorted by updated_at desc)
    console.log('--- Test 1: Default list (updated_at desc) ---');
    const defaultData = await fetchTopics({ page: 1, limit: 5 });
    console.log(`Total topics: ${defaultData.pagination.total}`);
    console.log('Topics returned:');
    defaultData.topics.forEach(t => console.log(` - ${t.title} (Updated at: ${t.updated_at})`));

    // Verify ordering
    for (let i = 0; i < defaultData.topics.length - 1; i++) {
      const current = new Date(defaultData.topics[i].updated_at).getTime();
      const next = new Date(defaultData.topics[i + 1].updated_at).getTime();
      if (current < next) {
        console.error('ERROR: Default ordering updated_at desc is invalid!');
        process.exit(1);
      }
    }
    console.log('PASS: Default sorting matches updated_at desc');

    // 2. Test sorting by title asc
    console.log('\n--- Test 2: Sorting by title asc ---');
    const titleAscData = await fetchTopics({ page: 1, limit: 5, sortBy: 'title', order: 'asc' });
    titleAscData.topics.forEach(t => console.log(` - ${t.title}`));
    
    // Verify ordering
    for (let i = 0; i < titleAscData.topics.length - 1; i++) {
      const current = titleAscData.topics[i].title.toLowerCase();
      const next = titleAscData.topics[i + 1].title.toLowerCase();
      if (current.localeCompare(next) > 0) {
        console.error('ERROR: Title asc ordering is invalid!');
        process.exit(1);
      }
    }
    console.log('PASS: Title asc sorting matches expectation');

    // 3. Test sorting by title desc
    console.log('\n--- Test 3: Sorting by title desc ---');
    const titleDescData = await fetchTopics({ page: 1, limit: 5, sortBy: 'title', order: 'desc' });
    titleDescData.topics.forEach(t => console.log(` - ${t.title}`));
    
    // Verify ordering
    for (let i = 0; i < titleDescData.topics.length - 1; i++) {
      const current = titleDescData.topics[i].title.toLowerCase();
      const next = titleDescData.topics[i + 1].title.toLowerCase();
      if (current.localeCompare(next) < 0) {
        console.error('ERROR: Title desc ordering is invalid!');
        process.exit(1);
      }
    }
    console.log('PASS: Title desc sorting matches expectation');

    // 4. Test date filtering (e.g. 7d)
    console.log('\n--- Test 4: Date filtering last 7 days ---');
    const recentData = await fetchTopics({ page: 1, limit: 5, dateFilter: '7d' });
    console.log(`Topics updated in last 7 days: ${recentData.pagination.total}`);
    recentData.topics.forEach(t => console.log(` - ${t.title} (Updated at: ${t.updated_at})`));

    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
    recentData.topics.forEach(t => {
      const updatedAt = new Date(t.updated_at).getTime();
      if (updatedAt < sevenDaysAgo.getTime()) {
        console.error(`ERROR: Topic ${t.title} updated at ${t.updated_at} is older than 7 days!`);
        process.exit(1);
      }
    });
    console.log('PASS: All returned topics are within last 7 days');

    console.log('\n======================================');
    console.log('ALL TOPICS FILTERING TESTS PASSED! 🎉');
    console.log('======================================');
  } catch (error) {
    console.error('Test execution failed:', error);
    process.exit(1);
  }
})();
