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

    // Set canvas size to match video
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;

    // Draw current video frame to canvas
    context.drawImage(video, 0, 0);

    // Convert to base64 for processing
    const imageData = canvas.toDataURL('image/jpeg', 0.8);

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

  // Extract tracking number from image (simplified OCR simulation)
  const extractTrackingFromImage = async (imageData: string): Promise<string | null> => {
    // This is a simplified version. In production, you'd use proper OCR
    // For now, we'll return null and rely on manual entry
    // You could integrate with services like:
    // - Tesseract.js for client-side OCR
    // - Google Vision API
    // - AWS Textract
    // - Azure Computer Vision

    return null; // Placeholder - would implement actual OCR here
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

      {/* Camera Modal */}
      {isCameraModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-75">
          <div className="relative w-full h-full max-w-lg mx-4 bg-white rounded-lg overflow-hidden">
            {/* Modal Header */}
            <div className="flex items-center justify-between p-4 border-b">
              <h3 className="text-lg font-semibold">📱 Package Scanner</h3>
              <Button variant="ghost" size="sm" onClick={closeCameraModal}>
                <X className="w-4 h-4" />
              </Button>
            </div>

            {/* Camera Feed */}
            <div className="relative">
              {/* Camera Status */}
              {isScanning && (
                <div className="absolute top-2 left-2 z-10 bg-green-500 text-white text-xs px-2 py-1 rounded flex items-center gap-1">
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
                className="w-full h-80 bg-black object-cover"
                style={{
                  minHeight: '320px',
                  backgroundColor: '#000000'
                }}
                onClick={() => {
                  // Allow manual play trigger for iOS
                  if (videoRef.current) {
                    videoRef.current.play().catch(console.error);
                  }
                }}
              />

              {/* Scanning Frame Overlay */}
              <div className="absolute inset-0 pointer-events-none">
                <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-64 h-32 border-2 border-blue-500 rounded bg-blue-500/10">
                  <div className="text-center text-xs text-blue-600 mt-12 font-semibold">
                    📦 Point at tracking number
                  </div>
                </div>
              </div>

              {/* Instructions Overlay */}
              <div className="absolute bottom-2 left-2 right-2 bg-black/80 text-white text-xs p-3 rounded">
                <div className="text-center">
                  📱 <strong>iOS Users:</strong> If video appears black, tap the video area to start camera
                </div>
              </div>

              {/* Debug info */}
              <div className="absolute top-2 right-2 bg-black/70 text-white text-xs p-1 rounded">
                {videoRef.current?.videoWidth && videoRef.current?.videoHeight ? 
                  `${videoRef.current.videoWidth}x${videoRef.current.videoHeight}` : 
                  'Initializing...'}
              </div>
            </div>

            {/* Modal Footer with Controls */}
            <div className="p-4 space-y-3">
              {/* Take Picture Button */}
              <Button 
                onClick={captureImage} 
                disabled={isProcessing || !isScanning} 
                className="w-full h-12 text-lg bg-blue-600 hover:bg-blue-700"
              >
                <Package className="w-5 h-5 mr-2" />
                {isProcessing ? '🔄 Processing...' : '📸 Take Picture of Label'}
              </Button>

              {/* Close Button */}
              <Button 
                variant="outline" 
                onClick={closeCameraModal} 
                className="w-full"
              >
                Close Scanner
              </Button>

              {/* Camera Status Text */}
              <div className="text-center text-sm text-gray-600">
                {isScanning ? (
                  <span className="text-green-600">✅ Camera Active - Point at package label</span>
                ) : (
                  <span className="text-orange-600">⏳ Starting camera...</span>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}