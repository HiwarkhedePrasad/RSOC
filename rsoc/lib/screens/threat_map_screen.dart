import 'package:flutter/material.dart';
import 'package:google_maps_flutter/google_maps_flutter.dart';
import 'package:geolocator/geolocator.dart';
import 'package:shimmer/shimmer.dart';
import '../theme/app_theme.dart';
import '../services/api_service.dart';

class ThreatMapScreen extends StatefulWidget {
  const ThreatMapScreen({super.key});

  @override
  State<ThreatMapScreen> createState() => _ThreatMapScreenState();
}

class _ThreatMapScreenState extends State<ThreatMapScreen> {
  GoogleMapController? _mapController;
  Set<Marker> _markers = {};
  Set<Circle> _circles = {};
  bool _isLoading = true;
  Position? _currentPosition;
  final MapType _mapType = MapType.hybrid;

  @override
  void initState() {
    super.initState();
    _initializeMap();
  }

  Future<void> _initializeMap() async {
    try {
      // Get current location
      _currentPosition = await Geolocator.getCurrentPosition(
        desiredAccuracy: LocationAccuracy.high,
      );
      
      // Load threat data
      await _loadThreatData();
      
      setState(() {
        _isLoading = false;
      });
    } catch (e) {
      setState(() {
        _isLoading = false;
      });
    }
  }

  Future<void> _loadThreatData() async {
    // Simulate threat data for demo
    final threats = [
      {'lat': 40.7128, 'lng': -74.0060, 'severity': 'high', 'type': 'DDoS Attack'},
      {'lat': 40.7589, 'lng': -73.9851, 'severity': 'critical', 'type': 'Data Breach'},
      {'lat': 40.7489, 'lng': -73.9680, 'severity': 'medium', 'type': 'Malware'},
      {'lat': 40.6892, 'lng': -74.0445, 'severity': 'low', 'type': 'Suspicious Activity'},
      {'lat': 40.7282, 'lng': -73.9942, 'severity': 'high', 'type': 'Phishing'},
    ];

    final newMarkers = <Marker>{};
    final newCircles = <Circle>{};

    for (int i = 0; i < threats.length; i++) {
      final threat = threats[i];
      final position = LatLng(threat['lat'] as double, threat['lng'] as double);
      
      // Add marker
      newMarkers.add(
        Marker(
          markerId: MarkerId('threat_$i'),
          position: position,
          icon: BitmapDescriptor.defaultMarkerWithHue(
            _getSeverityColor(threat['severity'] as String),
          ),
          infoWindow: InfoWindow(
            title: threat['type'] as String,
            snippet: 'Severity: ${threat['severity']}',
          ),
        ),
      );

      // Add threat radius circle
      newCircles.add(
        Circle(
          circleId: CircleId('circle_$i'),
          center: position,
          radius: _getSeverityRadius(threat['severity'] as String),
          fillColor: _getSeverityColor(threat['severity'] as String).withOpacity(0.2),
          strokeColor: _getSeverityColor(threat['severity'] as String),
          strokeWidth: 2,
        ),
      );
    }

    setState(() {
      _markers = newMarkers;
      _circles = newCircles;
    });
  }

  double _getSeverityColor(String severity) {
    switch (severity.toLowerCase()) {
      case 'critical':
        return BitmapDescriptor.hueRed;
      case 'high':
        return BitmapDescriptor.hueOrange;
      case 'medium':
        return BitmapDescriptor.hueYellow;
      case 'low':
        return BitmapDescriptor.hueGreen;
      default:
        return BitmapDescriptor.hueBlue;
    }
  }

  double _getSeverityRadius(String severity) {
    switch (severity.toLowerCase()) {
      case 'critical':
        return 1000;
      case 'high':
        return 800;
      case 'medium':
        return 600;
      case 'low':
        return 400;
      default:
        return 500;
    }
  }

  void _onMapCreated(GoogleMapController controller) {
    _mapController = controller;
  }

  @override
  Widget build(BuildContext context) {
    final isDark = Theme.of(context).brightness == Brightness.dark;

    return Scaffold(
      appBar: AppBar(
        title: const Text('Live Threat Map'),
        backgroundColor: isDark ? const Color(0xFF1E1E2E) : Colors.white,
        elevation: 0,
        actions: [
          IconButton(
            icon: const Icon(Icons.refresh),
            onPressed: _loadThreatData,
          ),
          PopupMenuButton<MapType>(
            icon: const Icon(Icons.layers),
            onSelected: (MapType type) {
              setState(() {
                // Handle map type change
              });
            },
            itemBuilder: (context) => [
              const PopupMenuItem(
                value: MapType.normal,
                child: Text('Normal'),
              ),
              const PopupMenuItem(
                value: MapType.satellite,
                child: Text('Satellite'),
              ),
              const PopupMenuItem(
                value: MapType.hybrid,
                child: Text('Hybrid'),
              ),
              const PopupMenuItem(
                value: MapType.terrain,
                child: Text('Terrain'),
              ),
            ],
          ),
        ],
      ),
      body: _isLoading
          ? _buildLoadingState()
          : Stack(
              children: [
                GoogleMap(
                  onMapCreated: _onMapCreated,
                  initialCameraPosition: CameraPosition(
                    target: _currentPosition != null
                        ? LatLng(_currentPosition!.latitude, _currentPosition!.longitude)
                        : const LatLng(40.7128, -74.0060), // NYC default
                    zoom: 12,
                  ),
                  markers: _markers,
                  circles: _circles,
                  mapType: _mapType,
                  myLocationEnabled: true,
                  myLocationButtonEnabled: true,
                  zoomControlsEnabled: true,
                ),
                
                // Threat Legend
                Positioned(
                  top: 16,
                  left: 16,
                  child: Container(
                    padding: const EdgeInsets.all(16),
                    decoration: BoxDecoration(
                      color: isDark ? Colors.black.withOpacity(0.8) : Colors.white.withOpacity(0.9),
                      borderRadius: BorderRadius.circular(12),
                      boxShadow: [
                        BoxShadow(
                          color: Colors.black.withOpacity(0.2),
                          blurRadius: 10,
                          offset: const Offset(0, 2),
                        ),
                      ],
                    ),
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Text(
                          'Threat Levels',
                          style: TextStyle(
                            fontWeight: FontWeight.bold,
                            color: isDark ? Colors.white : Colors.black,
                          ),
                        ),
                        const SizedBox(height: 8),
                        _buildLegendItem('Critical', Colors.red),
                        _buildLegendItem('High', Colors.orange),
                        _buildLegendItem('Medium', Colors.yellow),
                        _buildLegendItem('Low', Colors.green),
                      ],
                    ),
                  ),
                ),
                
                // Live Status Indicator
                Positioned(
                  bottom: 16,
                  right: 16,
                  child: Container(
                    padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
                    decoration: BoxDecoration(
                      color: Colors.red,
                      borderRadius: BorderRadius.circular(20),
                      boxShadow: [
                        BoxShadow(
                          color: Colors.red.withOpacity(0.3),
                          blurRadius: 10,
                          spreadRadius: 2,
                        ),
                      ],
                    ),
                    child: Row(
                      mainAxisSize: MainAxisSize.min,
                      children: [
                        Container(
                          width: 8,
                          height: 8,
                          decoration: const BoxDecoration(
                            color: Colors.white,
                            shape: BoxShape.circle,
                          ),
                        ),
                        const SizedBox(width: 8),
                        const Text(
                          'LIVE',
                          style: TextStyle(
                            color: Colors.white,
                            fontWeight: FontWeight.bold,
                            fontSize: 12,
                          ),
                        ),
                      ],
                    ),
                  ),
                ),
              ],
            ),
    );
  }

  Widget _buildLoadingState() {
    final isDark = Theme.of(context).brightness == Brightness.dark;
    
    return Shimmer.fromColors(
      baseColor: isDark ? const Color(0xFF1E1E2E) : Colors.grey[300]!,
      highlightColor: isDark ? const Color(0xFF2D2D44) : Colors.grey[100]!,
      child: Container(
        color: isDark ? const Color(0xFF1E1E2E) : Colors.white,
      ),
    );
  }

  Widget _buildLegendItem(String label, Color color) {
    final isDark = Theme.of(context).brightness == Brightness.dark;
    
    return Padding(
      padding: const EdgeInsets.symmetric(vertical: 2),
      child: Row(
        children: [
          Container(
            width: 12,
            height: 12,
            decoration: BoxDecoration(
              color: color,
              shape: BoxShape.circle,
            ),
          ),
          const SizedBox(width: 8),
          Text(
            label,
            style: TextStyle(
              color: isDark ? Colors.white : Colors.black,
              fontSize: 12,
            ),
          ),
        ],
      ),
    );
  }
}
