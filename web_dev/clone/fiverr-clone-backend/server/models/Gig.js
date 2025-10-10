const mongoose = require('mongoose');

const gigSchema = new mongoose.Schema({
  title: {
    type: String,
    required: [true, 'Title is required'],
    trim: true,
    maxlength: [80, 'Title cannot exceed 80 characters']
  },
  description: {
    type: String,
    required: [true, 'Description is required'],
    maxlength: [1200, 'Description cannot exceed 1200 characters']
  },
  category: {
    type: String,
    required: [true, 'Category is required'],
    enum: ['Web Development', 'Graphic Design', 'Digital Marketing', 'Writing', 'Video Editing', 'Other']
  },
  subcategory: {
    type: String,
    trim: true
  },
  tags: [{
    type: String,
    trim: true
  }],
  freelancer: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  pricing: {
    basic: {
      title: String,
      description: String,
      price: {
        type: Number,
        required: true,
        min: [5, 'Price must be at least $5']
      },
      deliveryTime: Number, // in days
      revisions: Number
    },
    standard: {
      title: String,
      description: String,
      price: Number,
      deliveryTime: Number,
      revisions: Number
    },
    premium: {
      title: String,
      description: String,
      price: Number,
      deliveryTime: Number,
      revisions: Number
    }
  },
  images: [{
    url: String,
    public_id: String // for Cloudinary
  }],
  rating: {
    type: Number,
    default: 0,
    min: 0,
    max: 5
  },
  totalReviews: {
    type: Number,
    default: 0
  },
  orders: {
    type: Number,
    default: 0
  },
  isActive: {
    type: Boolean,
    default: true
  },
  featured: {
    type: Boolean,
    default: false
  }
}, {
  timestamps: true
});

// Indexes for better query performance
gigSchema.index({ category: 1, isActive: 1 });
gigSchema.index({ freelancer: 1 });
gigSchema.index({ rating: -1 });
gigSchema.index({ '$**': 'text' }); // Text search index

module.exports = mongoose.model('Gig', gigSchema);