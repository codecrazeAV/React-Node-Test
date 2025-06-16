const MeetingHistory = require('../../model/schema/meeting')
const mongoose = require('mongoose');

const add = async (req, res) => {
    try {
        const { agenda, attendes, attendesLead, location, related, dateTime, notes, createBy } = req.body;
        
        // Validate ObjectIds for attendees
        if (attendes && attendes.length > 0) {
            for (let attendee of attendes) {
                if (!mongoose.Types.ObjectId.isValid(attendee)) {
                    return res.status(400).json({ error: 'Invalid attendee ID in attendes array' });
                }
            }
        }
        
        if (attendesLead && attendesLead.length > 0) {
            for (let attendee of attendesLead) {
                if (!mongoose.Types.ObjectId.isValid(attendee)) {
                    return res.status(400).json({ error: 'Invalid attendee ID in attendesLead array' });
                }
            }
        }

        const meetingData = { 
            agenda, 
            location, 
            related, 
            dateTime, 
            notes, 
            createBy, 
            timestamp: new Date() 
        };

        if (attendes && attendes.length > 0) {
            meetingData.attendes = attendes;
        }
        if (attendesLead && attendesLead.length > 0) {
            meetingData.attendesLead = attendesLead;
        }

        const result = new MeetingHistory(meetingData);
        await result.save();
        res.status(200).json(result);
    } catch (err) {
        console.error('Failed to create meeting:', err);
        res.status(400).json({ error: 'Failed to create meeting: ', err });
    }
}

const index = async (req, res) => {
    query = req.query;
    query.deleted = false;
    if (query.createBy) {
        query.createBy = new mongoose.Types.ObjectId(query.createBy);
    }

    try {
        let result = await MeetingHistory.aggregate([
            { $match: query },
            {
                $lookup: {
                    from: 'Contacts',
                    localField: 'attendes',
                    foreignField: '_id',
                    as: 'contactAttendees'
                }
            },
            {
                $lookup: {
                    from: 'Leads',
                    localField: 'attendesLead',
                    foreignField: '_id',
                    as: 'leadAttendees'
                }
            },
            {
                $lookup: {
                    from: 'User',
                    localField: 'createBy',
                    foreignField: '_id',
                    as: 'users'
                }
            },
            { $unwind: { path: '$users', preserveNullAndEmptyArrays: true } },
            { $match: { 'users.deleted': false } },
            {
                $addFields: {
                    createdByName: '$users.username',
                    attendeeCount: {
                        $add: [
                            { $size: { $ifNull: ['$contactAttendees', []] } },
                            { $size: { $ifNull: ['$leadAttendees', []] } }
                        ]
                    }
                }
            },
            { $project: { users: 0 } },
        ]);
        res.send(result);
    } catch (error) {
        console.error("Error:", error);
        res.status(500).send("Internal Server Error");
    }
}

const view = async (req, res) => {
    try {
        let response = await MeetingHistory.findOne({ _id: req.params.id })
        if (!response) return res.status(404).json({ message: "No meeting found." })
        
        let result = await MeetingHistory.aggregate([
            { $match: { _id: response._id } },
            {
                $lookup: {
                    from: 'Contacts',
                    localField: 'attendes',
                    foreignField: '_id',
                    as: 'attendes'
                }
            },
            {
                $lookup: {
                    from: 'Leads',
                    localField: 'attendesLead',
                    foreignField: '_id',
                    as: 'attendesLead'
                }
            },
            {
                $lookup: {
                    from: 'User',
                    localField: 'createBy',
                    foreignField: '_id',
                    as: 'users'
                }
            },
            { $unwind: { path: '$users', preserveNullAndEmptyArrays: true } },
            {
                $addFields: {
                    createdByName: '$users.username',
                }
            },
            { $project: { users: 0 } },
        ])
        res.status(200).json(result[0]);

    } catch (err) {
        console.log('Error:', err);
        res.status(400).json({ Error: err });
    }
}

const edit = async (req, res) => {
    try {
        const { agenda, attendes, attendesLead, location, related, dateTime, notes, createBy } = req.body;

        // Validate ObjectIds for attendees
        if (attendes && attendes.length > 0) {
            for (let attendee of attendes) {
                if (!mongoose.Types.ObjectId.isValid(attendee)) {
                    return res.status(400).json({ error: 'Invalid attendee ID in attendes array' });
                }
            }
        }
        
        if (attendesLead && attendesLead.length > 0) {
            for (let attendee of attendesLead) {
                if (!mongoose.Types.ObjectId.isValid(attendee)) {
                    return res.status(400).json({ error: 'Invalid attendee ID in attendesLead array' });
                }
            }
        }

        const meetingData = { agenda, location, related, dateTime, notes, createBy };

        if (attendes) {
            meetingData.attendes = attendes;
        }
        if (attendesLead) {
            meetingData.attendesLead = attendesLead;
        }

        let result = await MeetingHistory.findOneAndUpdate(
            { _id: req.params.id },
            { $set: meetingData },
            { new: true }
        );

        res.status(200).json(result);
    } catch (err) {
        console.error('Failed to update meeting:', err);
        res.status(400).json({ error: 'Failed to update meeting: ', err });
    }
}

const deleteData = async (req, res) => {
    try {
        const result = await MeetingHistory.findByIdAndUpdate(req.params.id, { deleted: true });
        res.status(200).json({ message: "Meeting deleted successfully", result })
    } catch (err) {
        res.status(404).json({ message: "error", err })
    }
}

const deleteMany = async (req, res) => {
    try {
        const result = await MeetingHistory.updateMany({ _id: { $in: req.body } }, { $set: { deleted: true } });

        if (result?.matchedCount > 0 && result?.modifiedCount > 0) {
            return res.status(200).json({ message: "Meetings removed successfully", result });
        } else {
            return res.status(404).json({ message: "No meetings found to delete" });
        }
    } catch (err) {
        console.error('Failed to delete meetings:', err);
        res.status(500).json({ message: "Error deleting meetings", err });
    }
}

module.exports = { add, index, view, edit, deleteData, deleteMany }