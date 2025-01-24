class FaceDirectionDetector {
    constructor(options = {}) {
        this.options = {
            // Threshold for considering the face as frontal (in degrees)
            angleThreshold: options.angleThreshold || 35,
            // Threshold for landmark position differences
            positionThreshold: options.positionThreshold || 0.15,
            // Minimum detection confidence
            minConfidence: options.minConfidence || 0.8,
            // Maximum number of faces to detect (0 for unlimited)
            maxFaces: options.maxFaces || 0
        };
        
        this.isInitialized = false;
        this.isRunning = false;
        this.video = null;
        this.canvas = null;
        this.onFacesDetected = null;
    }

    async initialize() {
        if (this.isInitialized) return;

        try {
            // Load required face-api.js models
            await Promise.all([
                faceapi.nets.tinyFaceDetector.loadFromUri('/'),
                faceapi.nets.faceLandmark68Net.loadFromUri('/')
            ]);
            
            this.isInitialized = true;
        } catch (error) {
            throw new Error(`Failed to initialize face detection: ${error.message}`);
        }
    }

    async startDetection(videoElement, callback) {
        if (!this.isInitialized) {
            await this.initialize();
        }

        this.video = videoElement;
        this.onFacesDetected = callback;

        // Create canvas for visualization if needed
        // this.canvas = faceapi.createCanvasFromMedia(this.video);
        // this.canvas.style.position = 'absolute';
        // this.canvas.style.top = '0';
        // this.canvas.style.left = '0';
        // this.video.parentNode.appendChild(this.canvas);

        this.isRunning = true;
      
        if (!this.isRunning || !this.video || this.video.paused || this.video.ended) {
            this.isRunning = false;
            return;
        }

        try {
            // Detect all faces in the frame
            const detections = await faceapi
                .detectAllFaces(this.video, new faceapi.TinyFaceDetectorOptions())
                .withFaceLandmarks();

            // Filter by confidence and limit number of faces if specified
            const validDetections = detections
                .filter(detection => detection.detection.score > this.options.minConfidence)
                .slice(0, this.options.maxFaces || undefined);

            // Analyze each face
            const facesAnalysis = validDetections.map(detection => ({
                isFrontal: this.estimateGaze(detection.landmarks) == "STRAIGHT",
                confidence: detection.detection.score,
                landmarks: detection.landmarks.positions,
                boundingBox: detection.detection.box,
                // Calculate face position relative to frame
                position: {
                    x: detection.detection.box.x + (detection.detection.box.width / 2),
                    y: detection.detection.box.y + (detection.detection.box.height / 2)
                }
            }));

            // Callback with results
            if (this.onFacesDetected) {
                this.onFacesDetected({
                    faces: facesAnalysis,
                    timestamp: Date.now()
                });
            }

            // Visualize results if canvas exists
            if (this.canvas) {
                const dims = faceapi.matchDimensions(this.canvas, this.video, true);
                const resizedDetections = faceapi.resizeResults(validDetections, dims);
                
                // Clear previous drawings
                const ctx = this.canvas.getContext('2d');
                ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
                
                // Draw face landmarks and additional information
                resizedDetections.forEach((detection, index) => {
                    const isFrontal = facesAnalysis[index].isFrontal;
                    
                    // Draw landmarks
                    faceapi.draw.drawFaceLandmarks(this.canvas, detection);
                    
                    // Draw bounding box with color based on frontal status
                    const box = detection.detection.box;
                    ctx.strokeStyle = isFrontal ? '#00ff00' : '#ff0000';
                    ctx.lineWidth = 2;
                    ctx.strokeRect(box.x, box.y, box.width, box.height);
                    
                    // Draw face status
                    ctx.fillStyle = isFrontal ? '#00ff00' : '#ff0000';
                    ctx.font = '16px Arial';
                    ctx.fillText(
                        `Face ${index + 1}: ${isFrontal ? 'Frontal' : 'Not Frontal'}`,
                        box.x,
                        box.y - 5
                    );
                });
            }
        } catch (error) {
            console.error('Detection error:', error);
        }

        // // Schedule next detection if still running
        // if (this.isRunning) {
        //     requestAnimationFrame(detect);
        // }
  }

  getCenterPoint(points) {
    const sumX = points.reduce((sum, point) => sum + point.x, 0);
    const sumY = points.reduce((sum, point) => sum + point.y, 0);
    return {
      x: sumX / points.length,
      y: sumY / points.length
    };
  }
  
  estimateGaze(landmarks) {
    const leftEye = landmarks.getLeftEye();
    const rightEye = landmarks.getRightEye();
    const nose = landmarks.getNose();
    
    // Calculate eye centers
    const leftEyeCenter = this.getCenterPoint(leftEye);
    const rightEyeCenter = this.getCenterPoint(rightEye);
    
    // Calculate eye-to-nose vector
    const eyeToNoseVector = {
      x: nose[0].x - (leftEyeCenter.x + rightEyeCenter.x) / 2,
      y: nose[0].y - (leftEyeCenter.y + rightEyeCenter.y) / 2
    };
    
    // Estimate gaze direction based on the eye-to-nose vector
    const gazeThreshold = 5; // Adjust this value as needed
    if (Math.abs(eyeToNoseVector.x) < gazeThreshold) {
      return "STRAIGHT";
    } else if (eyeToNoseVector.x > 0) {
      return "RIGHT";
    } else {
      return "LEFT";
    }
  }
  
    analyzeOrientation(landmarks) {
        // Get key facial landmarks
        const leftEye = this.getCentroid(landmarks.getLeftEye());
        const rightEye = this.getCentroid(landmarks.getRightEye());
        const nose = landmarks.getNose()[3]; // Nose tip
        const jawline = landmarks.getJawOutline();
        const jawLeft = jawline[0];
        const jawRight = jawline[jawline.length - 1];
        console.debug("left eye:", leftEye);
        console.debug("right eye:", rightEye);
        
        // Calculate face metrics
        const eyeDistance = this.getDistance(leftEye, rightEye);
        const eyeMidpoint = {
            x: (leftEye.x + rightEye.x) / 2,
            y: (leftEye.y + rightEye.y) / 2
        };
        console.debug("eye distance:", eyeDistance);
        
        // Check horizontal alignment (left-right rotation)
        const horizontalAngle = Math.abs(Math.atan2(
            rightEye.y - leftEye.y,
            rightEye.x - leftEye.x
        ) * (180 / Math.PI));
        console.debug("horizontal angle:", horizontalAngle);
        
        // Check vertical alignment (up-down tilt)
        const verticalAngle = Math.abs(Math.atan2(
            nose.y - eyeMidpoint.y,
            nose.x - eyeMidpoint.x
        ) * (180 / Math.PI));
        console.debug("vertical angle:", verticalAngle);
        
        // Check depth alignment (face rotation)
        const leftJawDistance = this.getDistance(jawLeft, nose);
        const rightJawDistance = this.getDistance(jawRight, nose);
        const jawAsymmetry = Math.abs(leftJawDistance - rightJawDistance) / Math.max(leftJawDistance, rightJawDistance);
        console.debug("jaw asymmetry:", jawAsymmetry);
        
        // Determine if face is frontal based on all metrics
        return (
            horizontalAngle < this.options.angleThreshold &&
            verticalAngle > 70 &&
            jawAsymmetry < 0.2
        );
    }

    getCentroid(points) {
        const sum = points.reduce((acc, point) => ({
            x: acc.x + point.x,
            y: acc.y + point.y
        }), { x: 0, y: 0 });
        
        return {
            x: sum.x / points.length,
            y: sum.y / points.length
        };
    }

    getDistance(point1, point2) {
        return Math.sqrt(
            Math.pow(point2.x - point1.x, 2) + 
            Math.pow(point2.y - point1.y, 2)
        );
    }

    stop() {
        this.isRunning = false;
        if (this.canvas) {
            this.canvas.remove();
            this.canvas = null;
        }
        this.video = null;
        this.onFacesDetected = null;
    }
}

// Usage example:
/*
const video = document.querySelector('video');
const detector = new FaceDirectionDetector({
    angleThreshold: 15,       // Maximum angle deviation for considering face as frontal
    positionThreshold: 0.15,  // Maximum asymmetry ratio for considering face as frontal
    minConfidence: 0.8,       // Minimum detection confidence
    maxFaces: 4              // Maximum number of faces to detect (0 for unlimited)
});

// Start webcam
navigator.mediaDevices.getUserMedia({ video: true })
    .then(stream => {
        video.srcObject = stream;
        return video.play();
    })
    .then(() => {
        // Start detection
        detector.startDetection(video, (result) => {
            console.log('Number of faces detected:', result.faces.length);
            result.faces.forEach((face, index) => {
                console.log(`Face ${index + 1}:`, {
                    isFrontal: face.isFrontal,
                    confidence: face.confidence,
                    position: face.position
                });
            });
        });
    })
    .catch(error => console.error('Error:', error));
*/