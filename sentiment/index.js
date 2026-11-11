require('dotenv').config();
const express = require('express');
const natural = require('natural');
const app = express();
app.use(express.json({ limit: '100kb' }));
const analyzer = new natural.SentimentAnalyzer('English', natural.PorterStemmer, 'afinn');
app.post('/sentiment', (req, res) => {
  const { sentence } = req.body;
  if (typeof sentence !== 'string' || !sentence.trim() || sentence.length > 5000) return res.status(400).json({ error: 'Provide a sentence of 1–5000 characters' });
  const tokenizer = new natural.WordTokenizer();
  const sentimentScore = analyzer.getSentiment(tokenizer.tokenize(sentence));
  res.json({ sentimentScore, sentiment: sentimentScore > 0 ? 'positive' : sentimentScore < 0 ? 'negative' : 'neutral' });
});
if (require.main === module) app.listen(process.env.SENTIMENT_PORT || 3061, () => console.log('Sentiment service started'));
module.exports = app;
