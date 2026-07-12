const express = require('express');
const dotenv = require('dotenv');
const cors = require('cors');
const path = require('path');
const connectDB = require('./config/db');
const { initGridFS } = require('./config/gridfs');

dotenv.config();
connectDB();
initGridFS();

const app = express();
app.use(cors({
  origin: '*',
  credentials: true
}));
app.use(express.json());

// Serve uploaded files statically
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

app.use('/api/auth', require('./routes/authRoutes'));
app.use('/api/users', require('./routes/userRoutes'));
app.use('/api/subjects', require('./routes/subjectRoutes'));
app.use('/api/progress', require('./routes/ProgressRoutes'));
app.use('/api/flashcards', require('./routes/flashcardRoutes'));
app.use('/api/teacher', require('./routes/teacherRoutes'))
app.use('/api/admin', require('./routes/adminRoutes'))
app.use('/api/quiz', require('./routes/quizRoutes'))
app.use('/api/materials', require('./routes/materialRoutes'))
app.use('/api/feedback', require('./routes/feedbackRoutes'))
app.use('/api/assignments', require('./routes/assignmentRoutes'))

app.get('/', (req, res) => {
  res.send('StudyNep API is running...');
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`🚀 Server running on port ${PORT}`));
