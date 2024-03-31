// backend/server.js
const express = require("express");
const mongoose = require("mongoose");
const cors = require("cors");
const bcrypt = require("bcrypt");
const bodyParser = require('body-parser');
const multer = require('multer');
const fs = require('fs'); 
const path = require('path');
const User = require("./models/user");
const Admin= require("./models/admin");
const Asset = require("./models/assets")

const app = express();
app.use(cors());
app.use(express.json());

mongoose.connect("mongodb+srv://yuvan:123@cluster1.dfzdlya.mongodb.net/dams", {
  useNewUrlParser: true,
  useUnifiedTopology: true,
})
.then(() => console.log("Connected to MongoDB"))
.catch(error => console.error("Error connecting to MongoDB:", error));

const adminSecret = "admin@123"

app.post("/register", async (req, res) => {
  const { username, password, email, department } = req.body;


  try {
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.json({ message: "Username already exists." });
    }
    const hashedPassword = await bcrypt.hash(password, 10);
    const newUser = new User({ username, email, password: hashedPassword, department });
    await newUser.save();
    res.json({ message: "Registration successful! please proceed to login" });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "An error occurred during registration." });
  }
});

app.post("/userlogin", async (req, res) => {
  const { email, password } = req.body;

  try {
    const user = await User.findOne({ email });
    if (!user) {
      res.status(401).json({ error: "Invalid credentials." });
      return;
    }

    const isPasswordValid = await bcrypt.compare(password, user.password);
    if (!isPasswordValid) {
      res.status(401).json({ error: "Invalid credentials." });
      return;
    }

    user.status = 'online';
    await user.save();
    res.json({ message: "Login successful!" });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "An error occurred during login." });
  }
});


app.post("/adminregister", async (req, res) => {
  const { username, password, email, department, adminSecretInput } = req.body;

  try {
    if (adminSecretInput !== adminSecret) {
      return res.status(401).json({ error: "Invalid admin secret." });
    }

    const existingUser = await Admin.findOne({ email });
    if (existingUser) {
      return res.json({ message: "Username already exists." });
    }
    const hashedPassword = await bcrypt.hash(password, 10);
    const adminUser = new Admin({ username, email, password: hashedPassword, department });
    await adminUser.save();
    res.json({ message: "Registration successful! Please proceed to login." });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "An error occurred during registration." });
  }
});


app.post("/adminlogin", async (req, res) => {
  const { email, password, adminSecretInput } = req.body;

  try {
    if (adminSecretInput !== adminSecret) {
      return res.status(401).json({ error: "Invalid admin secret." });
    }
    const user = await Admin.findOne({ email });
    if (!user) {
      res.status(401).json({ error: "Invalid credentials." });
      return;
    }

    const isPasswordValid = await bcrypt.compare(password, user.password);
    if (!isPasswordValid) {
      res.status(401).json({ error: "Invalid credentials." });
      return;
    }

    user.status = 'online';
    await user.save();
    res.json({ message: "Login successful!" });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "An error occurred during login." });
  }
});


app.use(bodyParser.json());


app.post("/logout", async (req, res) => {
  const { email, currentuser } = req.body;
  const presentuser = currentuser === 'admin'? Admin : User
  try {
    const user = await presentuser.findOne({ email });
    if (!user) {
      res.status(404).json({ error: "User not found." });
      return;
    }

    // Set user status to offline
    user.status = 'offline';
    await user.save();

    res.json({ message: "Logout successful!" });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "An error occurred during logout." });
  }
});

// server.js

app.get('/employeedetails', async (req, res) => {
  try {
    const users = await User.find();
    res.json(users);
  } catch (error) {
    console.error('Error fetching users:', error);
    res.status(500).json({ error: 'An error occurred while fetching users' });
  }
});


app.get('/fetchuserinfo', async (req, res) => {
  try {
    const userEmail = req.query.email; // Retrieve the email from the query parameters
    const user = await User.findOne({ email: userEmail }); // Fetch the user data based on the email
    res.json(user);
  } catch (error) {
    res.status(500).json({ error: 'An error occurred while fetching user data' });
  }
});

app.get('/fetchadmininfo', async (req, res) => {
  try {
    const adminEmail = req.query.email;
    const user = await Admin.findOne({ email: adminEmail });
    res.json(user);
  } catch (error) {
    res.status(500).json({ error: 'An error occurred while fetching user data' });
  }
});

const profilePictureStorage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, 'uploads'); // Store profile pictures in the "uploads" folder
  },
  filename: function (req, file, cb) {
    cb(null, Date.now() + '-' + file.originalname);
  }
});

const assetPictureStorage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, 'uploads/assets'); 
  },
  filename: function (req, file, cb) {
    cb(null, Date.now() + '-' + file.originalname);
  }
});

const uploadProfilePicture = multer({ storage: profilePictureStorage }).single('profilePicture');
const uploadAssetPicture = multer({ storage: assetPictureStorage }).single('picture');

app.post("/uploadProfilePicture/user", (req, res) => {
  uploadProfilePicture(req, res, async (err) => {
    try {
      if (err) {
        console.error('Error uploading profile picture:', err);
        return res.status(500).json({ error: 'An error occurred uploading the profile picture' });
      }

      const { email } = req.body;
      const fileData = fs.readFileSync(req.file.path);
      const base64Data = fileData.toString('base64');

      // Find the user by email
      const user = await User.findOneAndUpdate({ email });
      if (!user) {
        return res.status(404).json({ error: "User not found." });
      }

      // Update the user's profile picture
      user.profilePicture = base64Data;
      await user.save(); // Don't forget to call the save() method to persist the changes

      res.status(200).json({ message: 'Profile picture uploaded successfully' });
    } catch (error) {
      console.error('Error uploading profile picture:', error);
      res.status(500).json({ error: 'An error occurred uploading the profile picture' });
    }
  });
});


app.post("/uploadProfilePicture/admin", (req, res) => {
  uploadProfilePicture(req, res, async (err) => {
    try {
      if (err) {
        console.error('Error uploading profile picture:', err);
        return res.status(500).json({ error: 'An error occurred uploading the profile picture' });
      }

      const { email } = req.body;
      const fileData = fs.readFileSync(req.file.path);
      const base64Data = fileData.toString('base64');

      // Find the user by email
      const user = await Admin.findOneAndUpdate({ email });
      if (!user) {
        return res.status(404).json({ error: "User not found." });
      }

      // Update the user's profile picture
      user.profilePicture = base64Data;
      await user.save(); // Don't forget to call the save() method to persist the changes

      res.status(200).json({ message: 'Profile picture uploaded successfully' });
    } catch (error) {
      console.error('Error uploading profile picture:', error);
      res.status(500).json({ error: 'An error occurred uploading the profile picture' });
    }
  });
});


app.post("/assets/upload", uploadAssetPicture, async (req, res) => {
  try {
    const { refNo, name, date, amount, department } = req.body;
    const fileData = fs.readFileSync(req.file.path);
    const base64Data = fileData.toString('base64');

    const newAsset = new Asset({ refNo, name, picture: base64Data, date, amount, status: '-', belongsto: department }); // Store the image as base64 data in the database
    await newAsset.save();
    res.status(200).json({ message: 'Asset uploaded successfully' });
  } catch (error) {
    console.error('Error uploading asset:', error);
    res.status(500).json({ error: 'An error occurred uploading the asset' });
  }
});

app.put("/editassets/:id", uploadAssetPicture, async (req, res) => {
  const { id } = req.params;
  const { refNo, name, date, amount } = req.body;
  let updateFields = { refNo, name, date, amount };

  // Check if a new picture was uploaded
  if (req.file) {
    const fileData = fs.readFileSync(req.file.path);
    const base64Data = fileData.toString('base64');
    updateFields.picture = base64Data;
  }

  try {
    const updatedAsset = await Asset.findByIdAndUpdate(id, updateFields, { new: true });
    res.json(updatedAsset);
  } catch (error) {
    console.error('Error updating asset:', error);
    res.status(500).json({ error: 'An error occurred while updating the asset' });
  }
});

// Delete asset endpoint
app.delete("/assets/:id", async (req, res) => {
  const { id } = req.params;

  try {
    await Asset.findByIdAndDelete(id);
    res.json({ message: 'Asset deleted successfully' });
  } catch (error) {
    console.error('Error deleting asset:', error);
    res.status(500).json({ error: 'An error occurred while deleting the asset' });
  }
});

//get user profile

app.get('/userprofileinfo', async (req, res) => {
  try {
    const { email } = req.query;
    const user = await User.findOne({ email });
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }
    // Assuming you have stored the profile picture as a URL in the user document
    const { profilePicture, username, status } = user;
    res.status(200).json({ profilePicture, username, status });
  } catch (error) {
    console.error('Error fetching user profile:', error);
    res.status(500).json({ error: 'An error occurred while fetching user profile' });
  }
});


//admin profile info
app.get('/adminprofileinfo', async (req, res) => {
  try {
    const { email } = req.query;
    const user = await Admin.findOne({ email });
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }
    // Assuming you have stored the profile picture as a URL in the user document
    const { profilePicture, username, status } = user;
    res.status(200).json({ profilePicture, username, status });
  } catch (error) {
    console.error('Error fetching user profile:', error);
    res.status(500).json({ error: 'An error occurred while fetching user profile' });
  }
});


app.get('/assets', async (req, res) => {
  try {
    const assets = await Asset.find();
    res.json(assets);
  } catch (error) {
    console.error('Error fetching assets:', error);
    res.status(500).json({ error: 'An error occurred while fetching assets' });
  }
});

app.get('/searchusers', async (req, res) => {
  try {
    const searchText = req.query.search.toLowerCase();
    // Find users whose username or email matches the search text
    const matchingUsers = await User.find({
      $or: [
        { username: { $regex: searchText, $options: 'i' } }, // Case-insensitive regex search for username
        { email: { $regex: searchText, $options: 'i' } }, // Case-insensitive regex search for email
      ]
    });
    res.json(matchingUsers);
  } catch (error) {
    console.error('Error searching users:', error);
    res.status(500).json({ error: 'An error occurred while searching users' });
  }
});

app.get('/searchadmin', async (req, res) => {
  try {
    const searchText = req.query.search.toLowerCase();
    // Find users whose username or email matches the search text
    const matchingUsers = await Admin.find({
      $or: [
        { username: { $regex: searchText, $options: 'i' } }, // Case-insensitive regex search for username
        { email: { $regex: searchText, $options: 'i' } }, // Case-insensitive regex search for email
      ]
    });
    res.json(matchingUsers);
  } catch (error) {
    console.error('Error searching users:', error);
    res.status(500).json({ error: 'An error occurred while searching users' });
  }
});

app.post('/assignAsset', async (req, res) => {
  try {
    const { assetId, userId, borrowedAt, returnWithin } = req.body;

    // Find the asset by ID
    const asset = await Asset.findById(assetId);
    if (!asset) {
      return res.status(404).json({ message: 'Asset not found' });
    }

    // Check if the provided userId exists in the User collection
    const user = await User.findById(userId);
    if (user) {
      // If the userId belongs to a user, assign the asset to the user
      asset.status = 'borrowed';
      await asset.save();

      // Add the asset to the user's borrowedAssets array
      user.borrowedAssets.push({
        assetId: asset._id,
        borrowedAt,
        returnWithin,
        image: asset.picture, // Use the image from the asset
        assetName: asset.name,
        assetRefno: asset.refNo,
        assetBelongsto: asset.belongsto,
        assetAmount: asset.amount,
        assetStatus: 'borrowed'
      });

      // Save the updated user document
      await user.save();

      return res.status(200).json({ message: 'Asset assigned successfully' });
    }

    // Check if the provided userId exists in the Admin collection
    const admin = await Admin.findById(userId);
    if (admin) {
      // If the userId belongs to an admin, assign the asset to the admin
      // Perform similar steps as above for admins
      asset.status = 'borrowed';
      await asset.save();

      admin.borrowedAssets.push({
        assetId: asset._id,
        borrowedAt,
        returnWithin,
        image: asset.picture, // Use the image from the asset
        assetName: asset.name,
        assetRefno: asset.refNo,
        assetBelongsto: asset.belongsto,
        assetAmount: asset.amount,
        assetStatus: 'borrowed'
      });

      await admin.save();

      return res.status(200).json({ message: 'Asset assigned successfully' });
    }

    // If the userId doesn't belong to either a user or an admin
    return res.status(404).json({ message: 'User or admin not found' });
  } catch (error) {
    console.error('Error assigning asset:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
});



app.post('/borrowAsset', async (req, res) => {
  try {
    const { assetId, email, borrowedAt, returnWithin, assetName } = req.body;

    // Find the asset by ID
    const asset = await Asset.findById(assetId);
    if (!asset) {
      return res.status(404).json({ message: 'Asset not found' });
    }

    // Fetch the image from the asset
    const image = asset.picture;
    const refNo = asset.refNo;

    // Check if the provided userId exists in the User collection
    const user = await User.findOne({ email });
    if (user) {
      // If the userId belongs to a user, assign the asset to the user
      asset.status = 'Requested';
      await asset.save();

      user.requestedAssets.push({
        assetId: asset._id,
        borrowedAt,
        image,
        assetRefno: refNo,
        assetName,
        returnWithin,
        assetStatus: 'Requested',
        isReaded: false
      });
      await user.save();

      return res.status(200).json({ message: 'Request sent successfully' });
    }

    // Check if the provided userId exists in the Admin collection
    const admin = await Admin.findOne({ email });
    if (admin) {
      // If the userId belongs to an admin, assign the asset to the admin
      // Perform similar steps as above for admins
      asset.status = 'Requested';
      await asset.save();

      admin.requestedAssets.push({
        assetId: asset._id,
        borrowedAt,
        assetName,
        image,
        assetRefno: refNo,
        returnWithin,
        assetStatus: 'Requested'
      });
      await admin.save();

      return res.status(200).json({ message: 'Request sent successfully' });
    }

    // If the userId doesn't belong to either a user or an admin
    return res.status(404).json({ message: 'User or admin not found' });
  } catch (error) {
    console.error('Error assigning asset:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
});


// Route to fetch borrowed assets
app.get('/borrowedAssets', (req, res) => {
  const { email } = req.query; // Assuming you store the email in the header
  Admin.findOne({ email })
    .then(user => {
      if (!user) {
        return res.status(404).json({ message: 'User not found' });
      }
      const userBorrowedAssets = user.borrowedAssets;
      res.json(userBorrowedAssets);
    })
    .catch(error => {
      console.error('Error fetching user:', error);
      res.status(500).json({ message: 'Internal server error' });
    });
});

app.get('/userborrowedAssets', (req, res) => {
  const { email } = req.query; // Assuming you store the email in the header
  User.findOne({ email })
    .then(user => {
      if (!user) {
        return res.status(404).json({ message: 'User not found' });
      }
      const userBorrowedAssets = user.borrowedAssets;
      res.json(userBorrowedAssets);
    })
    .catch(error => {
      console.error('Error fetching user:', error);
      res.status(500).json({ message: 'Internal server error' });
    });
});

app.get('/borrowedassets/:id', async (req, res) => {
  try {
    const id = req.params.id;
    const asset = await Asset.findById(id);

    if (!asset) {
      return res.status(404).json({ error: 'Asset not found' });
    }

    // Respond with the asset details
    res.json(asset);
  } catch (error) {
    console.error('Error fetching asset:', error);
    res.status(500).json({ error: 'Unable to fetch asset' });
  }
});


//extention for the assets
app.post('/extensions', async (req, res) => {
  try {
    const { email, selectedAssetId, extensionReason, extensionDuration } = req.body;

    // Find the user by email
    const user = await User.findOne({ email });

    if (!user) {
      return res.status(404).json({ error: 'User not found.' });
    }

    // Find the borrowed asset by assetId
    const borrowedAsset = user.borrowedAssets.find(asset => asset.assetId === selectedAssetId);

    if (!borrowedAsset) {
      return res.status(404).json({ error: 'Borrowed asset not found.' });
    }

    // Update the borrowed asset with extension request details
    borrowedAsset.extensionRequested = true;
    borrowedAsset.extensionReason = extensionReason;
    borrowedAsset.extensionDuration = extensionDuration;
    borrowedAsset.extensionStatus = 'Pending';

    // Save the updated user data
    await user.save();

    res.status(200).json({ message: 'Extension requested successfully.' });
  } catch (error) {
    console.error('Error handling extension request:', error);
    res.status(500).json({ error: 'An internal server error occurred.' });
  }
});


app.post('/adminextensions', async (req, res) => {
  try {
    const { email, selectedAssetId, extensionReason, extensionDuration } = req.body;

    // Find the user by email
    const user = await Admin.findOne({ email });

    if (!user) {
      return res.status(404).json({ error: 'User not found.' });
    }

    // Find the borrowed asset by assetId
    const borrowedAsset = user.borrowedAssets.find(asset => asset.assetId === selectedAssetId);

    if (!borrowedAsset) {
      return res.status(404).json({ error: 'Borrowed asset not found.' });
    }

    // Update the borrowed asset with extension request details
    borrowedAsset.extensionRequested = true;
    borrowedAsset.extensionReason = extensionReason;
    borrowedAsset.extensionDuration = extensionDuration;
    borrowedAsset.extensionStatus = 'Pending';

    // Save the updated user data
    await user.save();

    res.status(200).json({ message: 'Extension requested successfully.' });
  } catch (error) {
    console.error('Error handling extension request:', error);
    res.status(500).json({ error: 'An internal server error occurred.' });
  }
});


app.get('/notifications', async (req, res) => {
  try {
    // Find users with extension requests
    const usersWithExtension = await User.find({
      $or: [
        { 'borrowedAssets.extensionRequested': true },
        { 'requestedAssets.assetStatus': 'Requested' }
      ]
    }).populate('borrowedAssets.assetId', 'name')
      .populate('requestedAssets.assetId', 'name');

    const notifications = [];
    // Extract relevant notification data for all statuses
    usersWithExtension.forEach(user => {
      user.borrowedAssets.forEach(asset => {
        if (asset.extensionRequested && asset.extensionStatus === 'Pending') {
          notifications.push({
            userId: user._id,
            username: user.username,
            useremail: user.email,
            department: user.department,
            role: user.role,
            assetName: asset.assetName,
            assetStatus: asset.assetStatus,
            extensionId: asset._id,
            extensionStatus: asset.extensionStatus,
            isReaded: asset.isReaded
          });
        }
      });

      // Check if user has requestedAssets array
      if (user.requestedAssets && Array.isArray(user.requestedAssets)) {
        user.requestedAssets.forEach(asset => {
          if (asset.assetStatus === 'Requested') {
            notifications.push({
              userId: user._id,
              username: user.username,
              useremail: user.email,
              department: user.department,
              role: user.role,
              requestId:asset._id,
              assetName: asset.assetName,
              assetStatus: asset.assetStatus,
              assetID: asset.assetId._id,
              isReaded: asset.isReaded
            });
          }
        });
      }
    });

    res.json(notifications);
  } catch (error) {
    console.error('Error fetching notifications:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});




app.get('/adminnotifications', async (req, res) => {
  try {
    // Find users with extension requests pending approval or requested assets
    const users = await User.find({
      $or: [
        { 'borrowedAssets.extensionRequested': true, 'borrowedAssets.extensionStatus': 'Pending' },
        { 'requestedAssets.assetStatus': 'Requested' }
      ]
    }).populate('borrowedAssets.assetId', 'name')
      .populate('requestedAssets.assetId', 'name');

    // Find admins with extension requests pending approval or requested assets
    const admins = await Admin.find({
      $or: [
        { 'borrowedAssets.extensionRequested': true, 'borrowedAssets.extensionStatus': 'Pending' },
        { 'requestedAssets.assetStatus': 'Requested' }
      ]
    }).populate('borrowedAssets.assetId', 'name')
      .populate('requestedAssets.assetId', 'name');

    // Combine user and admin notifications
    const notifications = [];

    // Process user notifications
    users.forEach(user => {
      user.borrowedAssets.forEach(asset => {
        if (asset.extensionRequested && asset.extensionStatus === 'Pending') {
          notifications.push({
            userId: user._id,
            username: user.username,
            useremail: user.email,
            department: user.department,
            role: user.role,
            assetName: asset.assetName,
            assetId: asset.assetId,
            assetStatus: asset.assetStatus,
            extensionId: asset._id,
            extensionStatus: asset.extensionStatus
          });
        }
      });
      user.requestedAssets.forEach(asset => {
        if (asset.assetStatus === 'Requested') {
          notifications.push({
            userId: user._id,
            username: user.username,
            useremail: user.email,
            department: user.department,
            role: user.role,
            assetId: asset.assetId,
            assetName: asset.assetName,
            assetStatus: asset.assetStatus,
            assetID: asset.assetId._id
          });
        }
      });
    });

    // Process admin notifications
    admins.forEach(admin => {
      admin.borrowedAssets.forEach(asset => {
        if (asset.extensionRequested && asset.extensionStatus === 'Pending') {
          notifications.push({
            userId: admin._id,
            username: admin.username,
            role: admin.role,
            useremail: admin.email,
            department: admin.department,
            assetId: asset.assetId,
            assetName: asset.assetName,
            assetStatus: asset.assetStatus,
            extensionId: asset._id,
            extensionStatus: asset.extensionStatus
          });
        }
      });
      admin.requestedAssets.forEach(asset => {
        if (asset.assetStatus === 'Requested') {
          notifications.push({
            userId: admin._id,
            username: admin.username,
            role: admin.role,
            useremail: admin.email,
            department: admin.department,
            assetId: asset.assetId,
            assetName: asset.assetName,
            assetStatus: asset.assetStatus,
            assetID: asset.assetId._id
          });
        }
      });
    });

    // Send notifications as response
    res.json(notifications);
  } catch (error) {
    console.error('Error fetching notifications for admin:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

app.put('/request/accept/:assetId', async (req, res) => {
  const assetId = req.params.assetId;
  try {
    // Find the requested asset by its ID and update its status to "Borrowed"
    const updatedAsset = await Asset.findByIdAndUpdate(assetId, { status: 'borrowed' });

    if (!updatedAsset) {
      return res.status(404).json({ error: 'Asset not found' });
    }

    // Find the user or admin by their ID
    const userOrAdmin = await User.findOne({ requestedAssets: { $elemMatch: { assetId: assetId } } })
      || await Admin.findOne({ requestedAssets: { $elemMatch: { assetId: assetId } } });

    if (!userOrAdmin) {
      return res.status(404).json({ error: 'User or admin not found' });
    }

    // Update the asset status in requestedAssets array to "Accepted"
    const index = userOrAdmin.requestedAssets.findIndex(asset => asset.assetId.toString() === assetId);
    if (index !== -1) {
      userOrAdmin.requestedAssets[index].assetStatus = 'borrowed';
      await userOrAdmin.save();
    }

    // Move the accepted asset from requestedAssets to borrowedAssets
    const acceptedAsset = userOrAdmin.requestedAssets.splice(index, 1)[0];
    userOrAdmin.borrowedAssets.push(acceptedAsset);
    await userOrAdmin.save();

    // Send the updated asset and a success message
    res.status(200).json({ message: 'Asset accepted successfully', updatedAsset });
  } catch (error) {
    console.error('Error accepting asset:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});


app.put('/request/decline/:assetId', async (req, res) => {
  const assetId = req.params.assetId;
  try {
    // Find the requested asset by its ID and update its status to "Declined"
    await Asset.findByIdAndUpdate(assetId, { status: '-' });

    // Update the asset status in the requestedAssets array of the user
    const user = await User.findOneAndUpdate(
      { "requestedAssets.assetId": assetId },
      { $set: { "requestedAssets.$.assetStatus": 'Declined' } },
      { new: true }
    );

    const admin = await Admin.findOneAndUpdate(
      { "requestedAssets.assetId": assetId },
      { $set: { "requestedAssets.$.assetStatus": 'Declined' } },
      { new: true }
    );


    res.status(200).json({ message: 'Asset declined successfully' });
  } catch (error) {
    console.error('Error declining asset:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});


app.put('/extensions/approve/:extensionId', async (req, res) => {
  try {
    const { extensionId } = req.params;

    // Find the user and admin documents
    const user = await User.findOne({ 'borrowedAssets._id': extensionId });
    const admin = await Admin.findOne({ 'borrowedAssets._id': extensionId });

    if (!user && !admin) {
      return res.status(404).json({ message: 'Extension ID not found in user or admin borrowed assets' });
    }

    // Determine the document to update
    const documentToUpdate = user ? user : admin;

    // Find the asset with the given extensionId
    const asset = documentToUpdate.borrowedAssets.find(asset => asset._id.toString() === extensionId);

    if (!asset) {
      return res.status(404).json({ message: 'Asset not found' });
    }

    // Update the returnWithin field based on the extension duration
    asset.returnWithin = asset.extensionDuration;
    asset.extensionStatus =  'Approved';
    asset.isReaded = false

    // Save the changes
    await documentToUpdate.save();

    res.json({ message: 'Extension approved successfully', asset });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Internal Server Error' });
  }
});





// Decline extension request
app.put('/extensions/decline/:extensionId', async (req, res) => {
  try {
    const { extensionId } = req.params;

    // Find the user or admin and update the extension status for the asset
    const user = await User.findOne({ "borrowedAssets._id": extensionId });
    const admin = await Admin.findOne({ "borrowedAssets._id": extensionId });

    let documentToUpdate;
    if (user) {
      documentToUpdate = user;
    } else if (admin) {
      documentToUpdate = admin;
    } else {
      return res.status(404).json({ error: 'User or admin not found' });
    }

    // Find the asset with the given extensionId
    const asset = documentToUpdate.borrowedAssets.find(asset => asset._id.toString() === extensionId);

    if (!asset) {
      return res.status(404).json({ error: 'Asset not found' });
    }

    // Update the extension status to 'Declined'
    asset.extensionStatus = 'declined';

    // Save the changes
    await documentToUpdate.save();

    res.json({ message: 'Extension request declined' });
  } catch (error) {
    console.error('Error declining extension request:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});



// Handling asset return
app.put('/assets/:assetId/return', async (req, res) => {
  try {
    const { assetId } = req.params;
    const asset = await Asset.findByIdAndUpdate(assetId, { status: 'Returned' }, { new: true });

    // Update the assetStatus in the User model
    const user = await User.findOneAndUpdate(
      { "borrowedAssets.assetId": assetId },
      { $set: { "borrowedAssets.$.assetStatus": 'Returned' } },
      { new: true }
    );

    // Update the assetStatus in the Admin model
    const admin = await Admin.findOneAndUpdate(
      { "borrowedAssets.assetId": assetId },
      { $set: { "borrowedAssets.$.assetStatus": 'Returned' } },
      { new: true }
    );

    res.json({ message: 'Asset returned successfully', asset });
  } catch (error) {
    console.error('Error returning asset:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});


app.get('/search', async (req, res) => {
  try {
    const searchTerm = req.query.term;
    const users = await User.find({ $or: [{ username: { $regex: searchTerm, $options: 'i' } }, { email: { $regex: searchTerm, $options: 'i' } }] });
    const admins = await Admin.find({ username: { $regex: searchTerm, $options: 'i' } });
    const assets = await Asset.find({ name: { $regex: searchTerm, $options: 'i' } });
    res.json({ users, admins, assets });
  } catch (error) {
    console.error('Error searching:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});


app.get('/details/:id', async (req, res) => {
  try {
    const id = req.params.id;
    const asset = await Asset.findById(id);
    if (asset) {
      return res.json(asset);
    }
    
    const admin = await Admin.findById(id);
    if (admin) {
      return res.json(admin);
    }
    
    const user = await User.findById(id);
    if (user) {
      return res.json(user);
    }

    res.status(404).json({ message: 'Data not found' });
  } catch (error) {
    console.error('Error fetching data:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
});


app.post('/check-password', async (req, res) => {
  const { currentPassword } = req.body;
  const email = req.headers['email'];

  if (!email) {
    return res.status(400).json({ error: "Email not provided." });
  }

  try {
    const admin = await Admin.findOne({ email });
    const user = await User.findOne({ email });
    if (!admin && !user) {
      return res.status(401).json({ error: "Invalid credentials." });
    }

    if (admin) {
      const isAdminPasswordValid = await bcrypt.compare(currentPassword, admin.password);
      if (!isAdminPasswordValid) {
        return res.status(401).json({ error: "Invalid credentials." });
      }
    }

    if (user) {
      const isUserPasswordValid = await bcrypt.compare(currentPassword, user.password);
      if (!isUserPasswordValid) {
        return res.status(401).json({ error: "Invalid credentials." });
      }
    }

    res.json({ message: "Verification successful!" });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "An error occurred." });
  }
});


app.post('/update-account', async (req, res) => {
  const { email, newPassword, newEmail } = req.body;
  try {
    let user;
    if (email) {
      user = await Admin.findOne({ email });
    } else {
      user = await User.findOne({ email });
    }

    if (!user) {
      return res.status(404).json({ error: "User not found." });
    }

    // Update the password if newPassword is provided
    if (newPassword) {
      const hashedPassword = await bcrypt.hash(newPassword, 10);
      user.password = hashedPassword;
    }

    // Update the email if newEmail is provided
    if (newEmail) {
      user.email = newEmail;
    }

    await user.save();

    res.json({ message: "Password and/or email updated successfully!" });
  } catch (error) {
    console.error('Error updating password and/or email:', error);
    res.status(500).json({ error: "An error occurred while updating password and/or email." });
  }
});


app.delete('/delete-user', async (req, res) => {
  const { userEmail } = req.query;

  try {
    const deletedUser = await User.findOneAndDelete({ userEmail });
    if (deletedUser) {
      res.json({ message: 'User deleted successfully' });
    } else {
      const deletedAdmin = await Admin.findOneAndDelete({ userEmail });
      if (deletedAdmin) {
        res.json({ message: 'Admin deleted successfully' });
      } else {
        res.status(404).json({ error: 'User or admin not found' });
      }
    }
  } catch (error) {
    console.error('Error deleting user:', error);
    res.status(500).json({ error: 'An error occurred while deleting user' });
  }
});


app.get('/fetchassets', async (req, res) => {
  try {
    const assets = await Asset.find();
    let totalAssets = 0;
    let borrowedAssets = 0;
    let totalWorth = 0;
    assets.forEach(asset => {
      totalAssets++;
      if (asset.status === 'borrowed') {
        borrowedAssets++;
      }
      totalWorth += asset.amount;
    });
    res.json({
      totalAssets,
      borrowedAssets,
      totalWorth
    });
  } catch (error) {
    // Handle errors
    console.error('Error fetching asset data:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});


app.get('/recentassets', async (req, res) => {
  try {
    const currentDate = new Date();
    const startTime = new Date(currentDate.getFullYear(), currentDate.getMonth(), currentDate.getDate());
    const endTime = new Date(currentDate.getFullYear(), currentDate.getMonth(), currentDate.getDate() + 1);
    const assets = await Asset.find({
      createdAt: { $gte: startTime, $lt: endTime }
    }).exec();

    res.json(assets);
  } catch (error) {
    console.error('Error fetching recent assets:', error);
    res.status(500).json({ error: 'An error occurred while fetching recent assets' });
  }
});



app.put('/mark-notification-read/:notificationId', async (req, res) => {
  try {
    const { notificationId } = req.params;

    // Find the user document
    const user = await User.findOne({});

    // Check if the user is found
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    // Function to update isReaded to true for the given assetId
    const updateIsReaded = (assetsArray) => {
      assetsArray.forEach(asset => {
        if (asset._id.toString() === notificationId) {
          asset.isReaded = true;
        }
      });
    };

    // Update isReaded in borrowedAssets
    updateIsReaded(user.borrowedAssets);

    // Update isReaded in requestedAssets
    updateIsReaded(user.requestedAssets);

    // Save the changes
    await user.save();

    res.json({ message: 'Notification marked as read successfully' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Internal Server Error' });
  }
});



app.listen(3001, () => {
  console.log("Server is running on port 3001");
});
