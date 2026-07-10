const mongoose = require('mongoose');
const { Readable } = require('stream');
const Assignment = require('../models/Assignment');
const { getGridFSBucket } = require('../config/gridfs');

const storeFile = (file, metadata = {}) => {
  return new Promise((resolve, reject) => {
    const bucket = getGridFSBucket();
    if (!bucket) {
      reject(new Error('GridFS not initialized'));
      return;
    }

    const readableStream = new Readable();
    readableStream.push(file.buffer);
    readableStream.push(null);

    const uploadStream = bucket.openUploadStream(file.originalname, {
      metadata: {
        originalName: file.originalname,
        mimetype: file.mimetype,
        ...metadata,
      },
    });

    readableStream.pipe(uploadStream);
    uploadStream.on('error', reject);
    uploadStream.on('finish', () => {
      resolve({
        filename: file.originalname,
        originalName: file.originalname,
        fileId: uploadStream.id.toString(),
        mimetype: file.mimetype,
        size: file.size,
      });
    });
  });
};

const summarizeAssignment = (assignment, userId) => {
  const plain = assignment.toObject ? assignment.toObject() : assignment;
  const submission = plain.submissions?.find(
    (item) => item.student?._id?.toString() === userId || item.student?.toString() === userId
  );

  return {
    ...plain,
    submissionCount: plain.submissions?.length || 0,
    mySubmission: submission || null,
  };
};

const getAssignments = async (req, res) => {
  try {
    const assignments = await Assignment.find()
      .populate('createdBy', 'name email')
      .populate('submissions.student', 'name email')
      .sort({ deadline: 1, createdAt: -1 });

    if (req.user.role === 'student') {
      return res.json(assignments.map((item) => summarizeAssignment(item, req.user.id)));
    }

    res.json(assignments);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

const createAssignment = async (req, res) => {
  try {
    const { title, subject, instructions, deadline, totalMarks, resourceUrl } = req.body;

    if (!title || !subject || !instructions || !deadline) {
      return res.status(400).json({ message: 'Title, subject, instructions, and deadline are required' });
    }

    const deadlineDate = new Date(deadline);
    if (Number.isNaN(deadlineDate.getTime())) {
      return res.status(400).json({ message: 'Please provide a valid deadline' });
    }

    const attachment = req.file
      ? await storeFile(req.file, { uploadedBy: req.user.id, purpose: 'assignment-attachment' })
      : undefined;

    const assignment = await Assignment.create({
      title,
      subject,
      instructions,
      deadline: deadlineDate,
      totalMarks: Number(totalMarks) || 100,
      resourceUrl,
      attachment,
      createdBy: req.user.id,
    });

    const populated = await Assignment.findById(assignment._id).populate('createdBy', 'name email');
    res.status(201).json(populated);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

const updateAssignment = async (req, res) => {
  try {
    const assignment = await Assignment.findById(req.params.id);
    if (!assignment) {
      return res.status(404).json({ message: 'Assignment not found' });
    }

    const { title, subject, instructions, deadline, totalMarks, resourceUrl } = req.body;
    if (title !== undefined) assignment.title = title;
    if (subject !== undefined) assignment.subject = subject;
    if (instructions !== undefined) assignment.instructions = instructions;
    if (deadline !== undefined) assignment.deadline = new Date(deadline);
    if (totalMarks !== undefined) assignment.totalMarks = Number(totalMarks);
    if (resourceUrl !== undefined) assignment.resourceUrl = resourceUrl;

    if (req.file) {
      if (assignment.attachment?.fileId) {
        const bucket = getGridFSBucket();
        if (bucket) {
          await bucket.delete(new mongoose.Types.ObjectId(assignment.attachment.fileId)).catch(() => {});
        }
      }
      assignment.attachment = await storeFile(req.file, { uploadedBy: req.user.id, purpose: 'assignment-attachment' });
    }

    await assignment.save();
    const populated = await Assignment.findById(assignment._id)
      .populate('createdBy', 'name email')
      .populate('submissions.student', 'name email');
    res.json(populated);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

const deleteAssignment = async (req, res) => {
  try {
    const assignment = await Assignment.findById(req.params.id);
    if (!assignment) {
      return res.status(404).json({ message: 'Assignment not found' });
    }

    const bucket = getGridFSBucket();
    const fileIds = [
      assignment.attachment?.fileId,
      ...assignment.submissions.map((submission) => submission.file?.fileId),
    ].filter(Boolean);

    if (bucket) {
      await Promise.all(
        fileIds.map((fileId) => bucket.delete(new mongoose.Types.ObjectId(fileId)).catch(() => {}))
      );
    }

    await assignment.deleteOne();
    res.json({ message: 'Assignment deleted' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

const submitAssignment = async (req, res) => {
  try {
    const assignment = await Assignment.findById(req.params.id);
    if (!assignment) {
      return res.status(404).json({ message: 'Assignment not found' });
    }

    if (!req.file && !req.body.note) {
      return res.status(400).json({ message: 'Upload a file or add a submission note' });
    }

    const existingSubmission = assignment.submissions.find(
      (submission) => submission.student.toString() === req.user.id
    );

    const file = req.file
      ? await storeFile(req.file, {
          uploadedBy: req.user.id,
          assignmentId: assignment._id.toString(),
          purpose: 'assignment-submission',
        })
      : existingSubmission?.file;

    if (existingSubmission?.file?.fileId && req.file) {
      const bucket = getGridFSBucket();
      if (bucket) {
        await bucket.delete(new mongoose.Types.ObjectId(existingSubmission.file.fileId)).catch(() => {});
      }
    }

    const status = new Date() > assignment.deadline ? 'Late' : 'Submitted';

    if (existingSubmission) {
      existingSubmission.note = req.body.note || '';
      existingSubmission.file = file;
      existingSubmission.submittedAt = new Date();
      existingSubmission.status = status;
    } else {
      assignment.submissions.push({
        student: req.user.id,
        note: req.body.note || '',
        file,
        status,
      });
    }

    await assignment.save();
    const populated = await Assignment.findById(assignment._id)
      .populate('createdBy', 'name email')
      .populate('submissions.student', 'name email');

    res.status(201).json(summarizeAssignment(populated, req.user.id));
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

const streamAssignmentFile = async (req, res) => {
  try {
    const assignment = await Assignment.findById(req.params.id);
    if (!assignment) {
      return res.status(404).json({ message: 'Assignment not found' });
    }

    let file = assignment.attachment;
    if (req.params.fileType === 'submission') {
      const submission = assignment.submissions.id(req.params.submissionId);
      if (!submission) {
        return res.status(404).json({ message: 'Submission not found' });
      }

      const ownsSubmission = submission.student.toString() === req.user.id;
      if (req.user.role === 'student' && !ownsSubmission) {
        return res.status(403).json({ message: 'Not authorized to access this submission' });
      }
      file = submission.file;
    }

    if (!file?.fileId) {
      return res.status(404).json({ message: 'File not found' });
    }

    const bucket = getGridFSBucket();
    if (!bucket) {
      return res.status(500).json({ message: 'GridFS not initialized' });
    }

    const downloadStream = bucket.openDownloadStream(new mongoose.Types.ObjectId(file.fileId));
    const disposition = req.query.download === 'true' ? 'attachment' : 'inline';
    res.set('Content-Type', file.mimetype || 'application/octet-stream');
    res.set('Content-Disposition', `${disposition}; filename="${file.originalName || file.filename}"`);

    downloadStream.pipe(res);
    downloadStream.on('error', () => {
      res.status(404).json({ message: 'File not found' });
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

module.exports = {
  getAssignments,
  createAssignment,
  updateAssignment,
  deleteAssignment,
  submitAssignment,
  streamAssignmentFile,
};
