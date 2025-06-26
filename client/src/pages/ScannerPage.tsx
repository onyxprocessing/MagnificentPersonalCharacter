import React, { useState, useRef, useEffect } from 'react';
import { Camera, Package, CheckCircle, XCircle, RotateCcw, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { apiRequest } from '@/lib/queryClient';
import Header from '@/components/layout/Header';
import MobileSidebar from '@/components/layout/MobileSidebar';
import Sidebar from '@/components/layout/Sidebar';

interface ScannedPackage {
  trackingNumber: string;
  orderId?: string;
  customerName?: string;
  status: 'found' | 'not_found' | 'already_fulfilled';
  timestamp: Date;
}

export default function ScannerPage() {
  const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState(false);
  const [isScanning, setIsScanning] = useState(false);
  const [isCameraModalOpen, setIsCameraModalOpen] = useState(false);
  const [scannedPackages, setScannedPackages] = useState<ScannedPackage[]>([]);
  const [manualTracking, setManualTracking] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const { toast } = useToast();

  // Start camera in modal
  const startCamera = () => {
    setIsCameraModalOpen(true);
    // Camera initialization will happen in the modal
  };

  // Initialize camera stream in modal
  const initializeCameraStream = async () => {
    try {
      // Check if getUserMedia is supported
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        throw new Error('Camera not supported on this device');
      }

      // Stop any existing stream first
      stopCamera();

      // Try multiple camera configurations for better compatibility
      let stream = null;
      const constraints = [
        // Try environment camera first (back camera)
        {
          video: {
            facingMode: { exact: 'environment' },
            width: { ideal: 1280 },
            height: { ideal: 720 }
          },
          audio: false
        },
        // Fallback to any camera with preferred constraints
        {
          video: {
            facingMode: 'environment',
            width: { ideal: 640 },
            height: { ideal: 480 }
          },
          audio: false
        },
        // Basic constraints as final fallback
        {
          video: true,
          audio: false
        }
      ];

      for (const constraint of constraints) {
        try {
          console.log('Trying camera constraint:', constraint);
          stream = await navigator.mediaDevices.getUserMedia(constraint);
          console.log('Camera stream obtained successfully');
          break;
        } catch (error) {
          console.log('Camera constraint failed:', error);
          continue;
        }
      }

      if (!stream) {
        throw new Error('Could not access camera with any configuration');
      }

      if (videoRef.current) {
        // Set up video element
        const video = videoRef.current;
        
        // Clear any existing source first
        video.srcObject = null;
        
        // Set critical iOS attributes BEFORE setting srcObject
        video.setAttribute('playsinline', '');
        video.setAttribute('webkit-playsinline', '');
        video.setAttribute('muted', '');
        video.setAttribute('autoplay', '');
        video.setAttribute('controls', 'false');
        video.muted = true;
        video.autoplay = true;
        video.playsInline = true;
        
        // Set dimensions to ensure visibility
        video.style.width = '100%';
        video.style.height = 'auto';
        video.style.minHeight = '300px';
        video.style.backgroundColor = '#000000';
        video.style.objectFit = 'cover';

        // Now set the stream
        video.srcObject = stream;

        // Wait for metadata to load, then play
        const handleLoadedMetadata = async () => {
          try {
            console.log('Video metadata loaded, attempting to play');
            console.log('Video readyState:', video.readyState);
            console.log('Video dimensions:', video.videoWidth, 'x', video.videoHeight);
            
            // Force play for iOS
            const playPromise = video.play();
            if (playPromise !== undefined) {
              await playPromise;
            }
            
            console.log('Video playing successfully');
            setIsScanning(true);
            
            // Double check the video is actually playing
            setTimeout(() => {
              console.log('Video paused?', video.paused);
              console.log('Video current time:', video.currentTime);
              if (video.paused) {
                console.log('Video is paused, trying to play again');
                video.play().catch(console.error);
              }
            }, 500);
            
            toast({
              title: "📱 Camera Ready",
              description: "Camera is now active! Point at tracking number on package label",
              variant: "default"
            });
          } catch (playError) {
            console.error('Error playing video:', playError);
            toast({
              title: "Camera Error", 
              description: "Could not start video playback. Try tapping the video area.",
              variant: "destructive"
            });
          }
        };

        const handleVideoError = (error: any) => {
          console.error('Video element error:', error);
          toast({
            title: "Video Error",
            description: "Camera video failed to load. Please try again.",
            variant: "destructive"
          });
        };

        const handleCanPlay = () => {
          console.log('Video can play');
          video.play().catch(console.error);
        };

        // Remove any existing event listeners
        video.removeEventListener('loadedmetadata', handleLoadedMetadata);
        video.removeEventListener('error', handleVideoError);
        video.removeEventListener('canplay', handleCanPlay);
        
        // Add event listeners
        video.addEventListener('loadedmetadata', handleLoadedMetadata);
        video.addEventListener('error', handleVideoError);
        video.addEventListener('canplay', handleCanPlay);

        // Try to play immediately for iOS
        setTimeout(() => {
          if (video.readyState >= 1) {
            handleLoadedMetadata();
          }
        }, 100);
      }
    } catch (error: any) {
      console.error('Error accessing camera:', error);

      let errorMessage = "Could not access camera. ";

      if (error.name === 'NotAllowedError') {
        errorMessage += "Please allow camera permissions in your browser settings.";
      } else if (error.name === 'NotFoundError') {
        errorMessage += "No camera found on this device.";
      } else if (error.name === 'NotSupportedError') {
        errorMessage += "Camera not supported on this device.";
      } else if (error.name === 'NotReadableError') {
        errorMessage += "Camera is already in use by another application.";
      } else {
        errorMessage += "Please check permissions or use manual entry.";
      }

      toast({
        title: "Camera Error",
        description: errorMessage,
        variant: "destructive"
      });
    }
  };

  // Stop camera
  const stopCamera = () => {
    if (videoRef.current?.srcObject) {
      const stream = videoRef.current.srcObject as MediaStream;
      stream.getTracks().forEach(track => track.stop());
      videoRef.current.srcObject = null;
    }
    setIsScanning(false);
  };

  // Close camera modal
  const closeCameraModal = () => {
    stopCamera();
    setIsCameraModalOpen(false);
  };

  // Initialize camera when modal opens
  useEffect(() => {
    if (isCameraModalOpen) {
      // Small delay to ensure modal is fully rendered
      setTimeout(() => {
        initializeCameraStream();
      }, 300);
    }
  }, [isCameraModalOpen]);

  // Capture and process image
  const captureImage = async () => {
    if (!videoRef.current || !canvasRef.current) return;

    const canvas = canvasRef.current;
    const video = videoRef.current;
    const context = canvas.getContext('2d');

    if (!context) return;

    // Optimize canvas size - limit to reasonable dimensions for OCR
    const maxWidth = 1280;
    const maxHeight = 720;
    
    let { width, height } = { width: video.videoWidth, height: video.videoHeight };

    // Scale down if too large
    if (width > maxWidth || height > maxHeight) {
      const scale = Math.min(maxWidth / width, maxHeight / height);
      width = Math.floor(width * scale);
      height = Math.floor(height * scale);
    }

    canvas.width = width;
    canvas.height = height;

    // Draw current video frame to canvas with scaling
    context.drawImage(video, 0, 0, width, height);

    // Convert to base64 with optimized quality for OCR (reduce file size)
    const imageData = canvas.toDataURL('image/jpeg', 0.6);

    console.log('Captured image size:', Math.round(imageData.length / 1024), 'KB');

    // Process the image to extract tracking number
    await processImage(imageData);
  };

  // Process image to extract tracking number using OCR-like logic
  const processImage = async (imageData: string) => {
    setIsProcessing(true);

    try {
      // For now, we'll simulate OCR by looking for common tracking number patterns
      // In a real implementation, you could use services like Tesseract.js or Google Vision API

      // Common tracking number patterns:
      // USPS: 9400 1234 5678 9012 3456 78, 9205 5901 2345 1234 5678 90
      // UPS: 1Z999AA1234567890
      // FedEx: 1234 5678 9012, 9612 0123 4567 8901 2345 67

      const trackingNumber = await extractTrackingFromImage(imageData);

      if (trackingNumber) {
        await processTrackingNumber(trackingNumber);
      } else {
        toast({
          title: "No Tracking Number Found",
          description: "Could not detect a tracking number in the image. Try manual entry.",
          variant: "destructive"
        });
      }
    } catch (error) {
      console.error('Error processing image:', error);
      toast({
        title: "Processing Error",
        description: "Error processing the image. Please try again.",
        variant: "destructive"
      });
    } finally {
      setIsProcessing(false);
    }
  };

  // Extract tracking number using simple image processing and pattern recognition
  const extractTrackingFromImageSimple = async (imageData: string): Promise<string | null> => {
    try {
      // Convert image to canvas for processing
      const img = new Image();
      img.src = imageData;
      
      await new Promise((resolve) => {
        img.onload = resolve;
      });
      
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      if (!ctx) return null;
      
      canvas.width = img.width;
      canvas.height = img.height;
      ctx.drawImage(img, 0, 0);
      
      // Convert to grayscale and increase contrast
      const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
      const data = imageData.data;
      
      for (let i = 0; i < data.length; i += 4) {
        const gray = data[i] * 0.299 + data[i + 1] * 0.587 + data[i + 2] * 0.114;
        const contrast = gray > 128 ? 255 : 0; // High contrast
        data[i] = contrast;     // red
        data[i + 1] = contrast; // green
        data[i + 2] = contrast; // blue
      }
      
      ctx.putImageData(imageData, 0, 0);
      
      // For now, return null - this would need more advanced image processing
      // to extract text without a proper OCR library
      return null;
      
    } catch (error) {
      console.error('Image processing error:', error);
      return null;
    }
  };

  // Extract tracking number from image using Google Cloud Vision API
  const extractTrackingFromImage = async (imageData: string): Promise<string | null> => {
    try {
      console.log('Starting Google Cloud Vision OCR processing...');
      
      // Convert base64 to blob for the API call
      const base64Data = imageData.split(',')[1]; // Remove data:image/jpeg;base64, prefix
      
      // Check image size before sending
      const imageSizeKB = Math.round((base64Data.length * 3) / 4 / 1024);
      console.log('Image size for OCR:', imageSizeKB, 'KB');
      
      if (imageSizeKB > 10000) { // 10MB limit
        console.warn('Image too large for OCR, trying compression...');
        // Further compress the image if it's still too large
        const img = new Image();
        img.src = imageData;
        await new Promise(resolve => img.onload = resolve);
        
        const compressCanvas = document.createElement('canvas');
        const compressCtx = compressCanvas.getContext('2d');
        if (!compressCtx) throw new Error('Cannot create compression canvas');
        
        // Further reduce size
        const maxSize = 800;
        const scale = Math.min(maxSize / img.width, maxSize / img.height);
        compressCanvas.width = Math.floor(img.width * scale);
        compressCanvas.height = Math.floor(img.height * scale);
        
        compressCtx.drawImage(img, 0, 0, compressCanvas.width, compressCanvas.height);
        const compressedData = compressCanvas.toDataURL('image/jpeg', 0.4).split(',')[1];
        
        console.log('Compressed image size:', Math.round((compressedData.length * 3) / 4 / 1024), 'KB');
        return await sendOCRRequest(compressedData);
      }
      
      return await sendOCRRequest(base64Data);
    } catch (error) {
      console.error('Google Vision OCR error:', error);
      // Fallback to Tesseract.js if Google Vision fails
      return await extractTrackingFromImageTesseract(imageData);
    }
  };

  // Separate function to handle OCR API request
  const sendOCRRequest = async (base64Data: string): Promise<string | null> => {
    try {
      
      // Call our backend API endpoint for Google Cloud Vision
      const response = await fetch('/api/ocr/google-vision', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          imageData: base64Data
        })
      });
      
      if (!response.ok) {
        const errorText = await response.text();
        console.error('Google Vision API call failed:', response.status, errorText);
        throw new Error(`OCR API failed: ${response.status}`);
      }
      
      const result = await response.json();
      console.log('Google Vision OCR Raw Text:', result.text);
      
      if (!result.text) {
        console.log('No text detected by Google Vision');
        return null;
      }
      
      return extractTrackingFromText(result.text);
      
    } catch (error) {
      console.error('OCR request error:', error);
      throw error;
    }
  };

  // Extract tracking numbers from text using common patterns
  const extractTrackingFromText = (text: string): string | null => {
    const trackingPatterns = [
      // USPS patterns
      /\b94\d{20}\b/g,                    // 9400 series (22 digits)
      /\b92\d{20}\b/g,                    // 9200 series (22 digits)
      /\b93\d{20}\b/g,                    // 9300 series (22 digits)
      /\b82\d{8}\b/g,                     // Certified Mail
      /\b70\d{14}\b/g,                    // Express Mail
      
      // UPS patterns
      /\b1Z[A-Z0-9]{16}\b/g,              // Standard UPS format
      
      // FedEx patterns
      /\b\d{12}\b/g,                      // 12 digit FedEx
      /\b\d{14}\b/g,                      // 14 digit FedEx
      /\b\d{20}\b/g,                      // 20 digit FedEx
      
      // DHL patterns
      /\b\d{10,11}\b/g,                   // 10-11 digit DHL
      
      // General long number patterns (fallback)
      /\b\d{15,22}\b/g                    // Any 15-22 digit number
    ];
    
    const cleanText = text.replace(/\s+/g, ' ').trim();
    
    for (const pattern of trackingPatterns) {
      const matches = cleanText.match(pattern);
      if (matches && matches.length > 0) {
        const trackingNumber = matches[0].replace(/\s/g, '');
        console.log('Found tracking number:', trackingNumber);
        return trackingNumber;
      }
    }
    
    // Try looking for patterns with spaces or dashes
    const spacedPatterns = [
      /\b94\d{2}\s?\d{4}\s?\d{4}\s?\d{4}\s?\d{4}\s?\d{2}\b/g,
      /\b92\d{2}\s?\d{4}\s?\d{4}\s?\d{4}\s?\d{4}\s?\d{2}\b/g,
      /\b1Z\s?[A-Z0-9]{3}\s?[A-Z0-9]{3}\s?[A-Z0-9]{10}\b/g
    ];
    
    for (const pattern of spacedPatterns) {
      const matches = cleanText.match(pattern);
      if (matches && matches.length > 0) {
        const trackingNumber = matches[0].replace(/[\s-]/g, '');
        console.log('Found spaced tracking number:', trackingNumber);
        return trackingNumber;
      }
    }
    
    console.log('No tracking number patterns found in text');
    return null;
  };

  // Fallback Tesseract.js OCR function
  const extractTrackingFromImageTesseract = async (imageData: string): Promise<string | null> => {
    try {
      console.log('Falling back to Tesseract.js OCR...');
      
      // Dynamic import to avoid loading Tesseract unless needed
      const Tesseract = await import('tesseract.js');
      
      // Configure Tesseract for better tracking number recognition
      const { data: { text } } = await Tesseract.recognize(imageData, 'eng', {
        logger: m => console.log('Tesseract Progress:', m),
        tessedit_char_whitelist: '0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ ',
        tessedit_pageseg_mode: Tesseract.PSM.SPARSE_TEXT
      });
      
      console.log('Tesseract OCR Raw Text:', text);
      
      return extractTrackingFromText(text);
      
    } catch (error) {
      console.error('Tesseract OCR Error:', error);
      return null;
    }
  };

  // Process tracking number (either from scan or manual entry)
  const processTrackingNumber = async (trackingNumber: string) => {
    if (!trackingNumber.trim()) return;

    setIsProcessing(true);

    try {
      // Search for orders with this tracking number or try to match it to pending orders
      const response = await apiRequest('GET', `/api/orders?search=${trackingNumber}`);

      if (response.success && response.data.length > 0) {
        const order = response.data[0];

        // Check if already fulfilled
        if (order.completed) {
          addScannedPackage({
            trackingNumber,
            orderId: order.id,
            customerName: `${order.firstname} ${order.lastname}`,
            status: 'already_fulfilled',
            timestamp: new Date()
          });

          toast({
            title: "Already Fulfilled",
            description: `Order for ${order.firstname} ${order.lastname} is already marked as fulfilled.`,
            variant: "destructive"
          });
          return;
        }

        // Mark as fulfilled
        await apiRequest('PATCH', `/api/orders/${order.id}`, {
          completed: true,
          partial: false,
          tracking: trackingNumber,
          shipped: true,
          shippingLabelCreated: true
        });

        addScannedPackage({
          trackingNumber,
          orderId: order.id,
          customerName: `${order.firstname} ${order.lastname}`,
          status: 'found',
          timestamp: new Date()
        });

        toast({
          title: "Order Fulfilled!",
          description: `Successfully marked order for ${order.firstname} ${order.lastname} as fulfilled.`,
          variant: "default"
        });

      } else {
        // Try to find by customer name or other details if tracking search fails
        addScannedPackage({
          trackingNumber,
          status: 'not_found',
          timestamp: new Date()
        });

        toast({
          title: "Order Not Found",
          description: `No pending order found for tracking number ${trackingNumber}`,
          variant: "destructive"
        });
      }
    } catch (error) {
      console.error('Error processing tracking number:', error);
      toast({
        title: "Processing Error",
        description: "Error processing the tracking number. Please try again.",
        variant: "destructive"
      });
    } finally {
      setIsProcessing(false);
      setManualTracking(''); // Clear manual input
    }
  };

  // Add scanned package to history
  const addScannedPackage = (packageData: ScannedPackage) => {
    setScannedPackages(prev => [packageData, ...prev.slice(0, 9)]); // Keep last 10
  };

  // Handle manual tracking entry
  const handleManualSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (manualTracking.trim()) {
      processTrackingNumber(manualTracking.trim());
    }
  };

  // Cleanup camera on unmount
  useEffect(() => {
    return () => {
      stopCamera();
    };
  }, []);

  return (
    <div className="flex h-screen bg-background">
      {/* Sidebar for desktop */}
      <Sidebar />

      {/* Mobile Sidebar */}
      <MobileSidebar 
        isOpen={isMobileSidebarOpen} 
        onClose={() => setIsMobileSidebarOpen(false)} 
      />

      {/* Main Content */}
      <div className="flex-1 flex flex-col overflow-hidden">
        <Header 
          onToggleMobileMenu={() => setIsMobileSidebarOpen(true)}
          title="Package Scanner"
        />

        <main className="flex-1 overflow-y-auto bg-background p-4">
          <div className="max-w-2xl mx-auto space-y-6">

            {/* Scanner Card */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Camera className="w-5 h-5" />
                  Scan Package Label
                </CardTitle>
                <p className="text-sm text-gray-600 mt-2">
                  📱 On iOS: Make sure to allow camera access when prompted by your browser
                </p>
              </CardHeader>
              <CardContent className="space-y-4">

                {/* Camera Status */}
                {isScanning && (
                  <div className="flex items-center justify-center gap-2 p-2 bg-green-50 border border-green-200 rounded-lg">
                    <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
                    <span className="text-sm text-green-700">Camera Active</span>
                  </div>
                )}

                {/* Camera Controls */}
                <div className="flex flex-col gap-2">
                  <Button onClick={startCamera} className="w-full h-12 text-lg">
                    <Camera className="w-5 h-5 mr-2" />
                    📱 Open Camera Scanner
                  </Button>
                </div>

                {/* Hidden canvas for image processing */}
                <canvas ref={canvasRef} style={{ display: 'none' }} />

                {/* Manual Entry */}
                <div className="border-t pt-4">
                  <form onSubmit={handleManualSubmit} className="space-y-4">
                    <div>
                      <Label htmlFor="manual-tracking">Manual Tracking Number Entry</Label>
                      <Input
                        id="manual-tracking"
                        value={manualTracking}
                        onChange={(e) => setManualTracking(e.target.value)}
                        placeholder="Enter tracking number manually"
                        className="font-mono"
                      />
                    </div>
                    <Button type="submit" disabled={isProcessing || !manualTracking.trim()}>
                      {isProcessing ? 'Processing...' : 'Process Tracking Number'}
                    </Button>
                  </form>
                </div>
              </CardContent>
            </Card>

            {/* Scanned Packages History */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Package className="w-5 h-5" />
                  Recent Scans
                </CardTitle>
              </CardHeader>
              <CardContent>
                {scannedPackages.length === 0 ? (
                  <p className="text-gray-500 text-center py-4">No packages scanned yet</p>
                ) : (
                  <div className="space-y-3">
                    {scannedPackages.map((pkg, index) => (
                      <div key={index} className="flex items-center justify-between p-3 border rounded-lg">
                        <div className="flex-1">
                          <div className="font-mono text-sm">{pkg.trackingNumber}</div>
                          {pkg.customerName && (
                            <div className="text-sm text-gray-600">{pkg.customerName}</div>
                          )}
                          <div className="text-xs text-gray-400">
                            {pkg.timestamp.toLocaleTimeString()}
                          </div>
                        </div>
                        <Badge
                          variant={
                            pkg.status === 'found' ? 'default' :
                            pkg.status === 'already_fulfilled' ? 'secondary' :
                            'destructive'
                          }
                          className="ml-2"
                        >
                          {pkg.status === 'found' && <CheckCircle className="w-3 h-3 mr-1" />}
                          {pkg.status === 'not_found' && <XCircle className="w-3 h-3 mr-1" />}
                          {pkg.status === 'already_fulfilled' && <RotateCcw className="w-3 h-3 mr-1" />}
                          {pkg.status === 'found' ? 'Fulfilled' :
                           pkg.status === 'already_fulfilled' ? 'Already Done' :
                           'Not Found'}
                        </Badge>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Instructions */}
            <Card>
              <CardHeader>
                <CardTitle>How to Use</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2 text-sm text-gray-600">
                <p>1. Click "Start Camera" to begin scanning</p>
                <p>2. Point camera at the tracking number on the package label</p>
                <p>3. Click "Scan Label" to capture and process the image</p>
                <p>4. The system will automatically find and fulfill matching orders</p>
                <p>5. Use manual entry if the camera scan doesn't work</p>
              </CardContent>
            </Card>
          </div>
        </main>
      </div>

      {/* Camera Modal - Mobile Optimized */}
      {isCameraModalOpen && (
        <div className="fixed inset-0 z-50 bg-black bg-opacity-95 flex flex-col">
          {/* Mobile-First Full Screen Layout with proper spacing */}
          <div className="flex-1 flex flex-col bg-white max-h-screen overflow-hidden">
            {/* Compact Header for Mobile */}
            <div className="flex items-center justify-between p-3 border-b bg-white shrink-0">
              <h3 className="text-base font-semibold">📱 Scanner</h3>
              <Button variant="ghost" size="sm" onClick={closeCameraModal}>
                <X className="w-4 h-4" />
              </Button>
            </div>

            {/* Camera Feed - Calculated height to leave room for controls */}
            <div className="relative bg-black" style={{ height: 'calc(100vh - 180px)' }}>
              {/* Camera Status */}
              {isScanning && (
                <div className="absolute top-3 left-3 z-10 bg-green-500 text-white text-xs px-2 py-1 rounded flex items-center gap-1">
                  <div className="w-2 h-2 bg-white rounded-full animate-pulse"></div>
                  LIVE
                </div>
              )}

              <video
                ref={videoRef}
                autoPlay
                playsInline
                muted
                controls={false}
                webkit-playsinline=""
                className="w-full h-full bg-black object-cover"
                style={{
                  backgroundColor: '#000000'
                }}
                onClick={() => {
                  // Allow manual play trigger for iOS
                  if (videoRef.current) {
                    videoRef.current.play().catch(console.error);
                  }
                }}
              />

              {/* Scanning Frame Overlay - Responsive */}
              <div className="absolute inset-0 pointer-events-none flex items-center justify-center">
                <div className="w-64 h-32 sm:w-72 sm:h-36 border-2 border-blue-500 rounded bg-blue-500/10 flex items-center justify-center">
                  <div className="text-center text-xs text-blue-600 font-semibold bg-white/90 px-2 py-1 rounded">
                    📦 Point at tracking number
                  </div>
                </div>
              </div>

              {/* Instructions Overlay - Moved higher to avoid button overlap */}
              <div className="absolute bottom-8 left-3 right-3 bg-black/80 text-white text-xs p-2 rounded">
                <div className="text-center">
                  📱 <strong>iOS:</strong> Tap video if camera appears black
                </div>
              </div>

              {/* Debug info - Top Right */}
              <div className="absolute top-3 right-3 bg-black/70 text-white text-xs p-1 rounded">
                {videoRef.current?.videoWidth && videoRef.current?.videoHeight ? 
                  `${videoRef.current.videoWidth}x${videoRef.current.videoHeight}` : 
                  'Starting...'}
              </div>
            </div>

            {/* Fixed Bottom Controls - Always Visible with safe area */}
            <div className="bg-white border-t shrink-0" style={{ 
              paddingBottom: 'max(16px, env(safe-area-inset-bottom))',
              paddingTop: '16px',
              paddingLeft: '16px', 
              paddingRight: '16px'
            }}>
              <div className="space-y-3 max-w-sm mx-auto">
                {/* Take Picture Button - Large and Prominent */}
                <Button 
                  onClick={captureImage} 
                  disabled={isProcessing || !isScanning} 
                  className="w-full h-12 text-base bg-blue-600 hover:bg-blue-700 font-semibold shadow-lg"
                >
                  <Package className="w-5 h-5 mr-2" />
                  {isProcessing ? '🔄 Reading Text...' : '📸 Take Picture of Label'}
                </Button>

                {/* Status and Close Row - Compact */}
                <div className="flex items-center justify-between text-sm">
                  <div className="text-gray-600">
                    {isScanning ? (
                      <span className="text-green-600 flex items-center gap-1">
                        <div className="w-1.5 h-1.5 bg-green-500 rounded-full animate-pulse"></div>
                        Ready
                      </span>
                    ) : (
                      <span className="text-orange-600">⏳ Starting</span>
                    )}
                  </div>
                  
                  {/* Close Button - Compact */}
                  <Button 
                    variant="ghost" 
                    size="sm"
                    onClick={closeCameraModal}
                    className="h-8 px-3 text-gray-500"
                  >
                    Close
                  </Button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}