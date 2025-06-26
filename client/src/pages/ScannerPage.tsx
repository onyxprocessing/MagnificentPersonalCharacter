
import React, { useState, useRef, useEffect } from 'react';
import { Camera, Package, CheckCircle, XCircle, RotateCcw } from 'lucide-react';
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
  const [scannedPackages, setScannedPackages] = useState<ScannedPackage[]>([]);
  const [manualTracking, setManualTracking] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const { toast } = useToast();

  // Start camera
  const startCamera = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: 'environment', // Use back camera on mobile
          width: { ideal: 1280 },
          height: { ideal: 720 }
        }
      });
      
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        
        // Wait for video to load and start playing
        videoRef.current.onloadedmetadata = () => {
          videoRef.current?.play().then(() => {
            setIsScanning(true);
            toast({
              title: "Camera Ready",
              description: "Point camera at the tracking number on the package label",
              variant: "default"
            });
          }).catch((playError) => {
            console.error('Error playing video:', playError);
            toast({
              title: "Camera Error",
              description: "Could not start video playback. Please try again.",
              variant: "destructive"
            });
          });
        };
      }
    } catch (error) {
      console.error('Error accessing camera:', error);
      toast({
        title: "Camera Error",
        description: "Could not access camera. Please check permissions or use manual entry.",
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
                <div className="flex gap-2">
                  {!isScanning ? (
                    <Button onClick={startCamera} className="flex-1">
                      <Camera className="w-4 h-4 mr-2" />
                      Start Camera
                    </Button>
                  ) : (
                    <>
                      <Button onClick={captureImage} disabled={isProcessing} className="flex-1">
                        <Package className="w-4 h-4 mr-2" />
                        {isProcessing ? 'Processing...' : 'Scan Label'}
                      </Button>
                      <Button variant="outline" onClick={stopCamera}>
                        Stop
                      </Button>
                    </>
                  )}
                </div>

                {/* Camera Preview */}
                {isScanning && (
                  <div className="relative">
                    <video
                      ref={videoRef}
                      autoPlay
                      playsInline
                      muted
                      webkit-playsinline="true"
                      className="w-full h-64 bg-black rounded-lg object-cover"
                      style={{ transform: 'scaleX(-1)' }}
                    />
                    <div className="absolute inset-0 border-2 border-blue-500 border-dashed rounded-lg pointer-events-none">
                      <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-32 h-16 border-2 border-blue-500 rounded bg-blue-500/10">
                        <div className="text-center text-xs text-blue-600 mt-6">Focus tracking number here</div>
                      </div>
                    </div>
                  </div>
                )}

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
    </div>
  );
}
