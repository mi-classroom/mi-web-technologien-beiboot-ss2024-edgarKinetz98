import express from "express";
import multer from "multer";
import { exec } from "child_process";
import { promisify } from "util";

const execAsync = promisify(exec);
const app = express();
app.use(express.json());

const upload = multer({ dest: "uploads/" });

// Upload endpoint
app.post("/upload", upload.single("video"), (req, res) => {
  if (req.file) {
    res
      .status(200)
      .json({ message: "Video uploaded", filePath: req.file.path });
  } else {
    res.status(400).send("No file uploaded.");
  }
});

// Split endpoint
app.post("/split", async (req, res) => {
  const { filePath } = req.body;

  if (!filePath) {
    return res.status(400).send("Video path is missing.");
  }

  const command = `ffmpeg -i "${filePath}" -vf scale=1600:-1 -r 30 output/frame%03d.png`;

  try {
    await execAsync(command);
    res
      .status(200)
      .json({ message: "Video split into frames", framesPath: "output/" });
  } catch (error) {
    if (error instanceof Error) {
      res.status(500).send(`An error occurred: ${error.message}`);
    } else {
      res.status(500).send("An unexpected error occurred");
    }
  }
});

// Montage endpoint
app.post("/montage", async (req, res) => {
  const { framesPath, startFrame, endFrame } = req.body;

  if (!framesPath || startFrame == null || endFrame == null) {
    return res.status(400).send("Required information is missing.");
  }

  // Generate the list of frame filenames
  const frames = [];
  for (let i = startFrame; i <= endFrame; i++) {
    frames.push(`"${framesPath}/frame${i.toString().padStart(3, "0")}.png"`);
  }

  const command = `magick convert ${frames.join(
    " "
  )} -evaluate-sequence mean output/output.png`;

  try {
    await execAsync(command);
    res.status(200).json({
      message: "Frames merged into image",
      montagePath: "output/output.png",
    });
  } catch (error) {
    if (error instanceof Error) {
      res.status(500).send(`An error occurred: ${error.message}`);
    } else {
      res.status(500).send("An unexpected error occurred");
    }
  }
});

const PORT = 3000;
app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});
