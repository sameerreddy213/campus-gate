const Notification = require('../models/Notification');

// Get all notifications for the logged-in user
exports.getMyNotifications = async (req, res) => {
    try {
        const notifications = await Notification.find({ recipient: req.user.id })
            .sort({ createdAt: -1 })
            .limit(50); // Limit to last 50

        const unreadCount = await Notification.countDocuments({ recipient: req.user.id, read: false });

        res.status(200).json({
            success: true,
            data: notifications,
            unreadCount
        });
    } catch (error) {
        console.error("Get Notifications Error:", error);
        res.status(500).json({ success: false, message: "Server Error" });
    }
};

// Mark a single notification as read
exports.markAsRead = async (req, res) => {
    try {
        await Notification.findOneAndUpdate(
            { _id: req.params.id, recipient: req.user.id },
            { read: true }
        );
        res.status(200).json({ success: true, message: "Marked as read" });
    } catch (error) {
        res.status(500).json({ success: false, message: "Server Error" });
    }
};

// Mark all as read
exports.markAllAsRead = async (req, res) => {
    try {
        await Notification.updateMany({ recipient: req.user.id, read: false }, { read: true });
        res.status(200).json({ success: true, message: "All marked as read" });
    } catch (error) {
        res.status(500).json({ success: false, message: "Server Error" });
    }
};

// Helper function to create notification (internal use)
exports.createNotification = async (recipientId, message, type = 'info', relatedId = null) => {
    try {
        await Notification.create({
            recipient: recipientId,
            message,
            type,
            relatedId
        });
    } catch (error) {
        console.error("Failed to create notification:", error);
    }
};

// Notify the parent User linked to a student (internal use).
// Parents are linked to students by phone number, not by a direct reference.
exports.notifyParent = async (student, message, type = 'info', relatedId = null) => {
    try {
        if (!student || !student.parentPhone) return;
        const User = require('../models/User');
        const parentUser = await User.findOne({ phone: student.parentPhone, role: 'parent' });
        if (parentUser) {
            await exports.createNotification(parentUser._id, message, type, relatedId);
        }
    } catch (error) {
        console.error("Failed to notify parent:", error);
    }
};
