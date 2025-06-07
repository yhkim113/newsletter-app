const express = require('express');
const router = express.Router();
const { searchNaverNews } = require('../services/newsService');

router.get('/search', async (req, res) => {
  const { keyword, startDate, endDate } = req.query;

  if (!keyword) {
    return res.status(400).json({ error: 'Keyword is required.' });
  }

  try {
    const newsArticles = await searchNaverNews(keyword, startDate, endDate);
    res.json({ articles: newsArticles });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;
