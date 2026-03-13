// ============================================================
// RSOC NexaCity Flutter App
// ============================================================
// pubspec.yaml dependencies needed:
//
// dependencies:
//   flutter:
//     sdk: flutter
//   http: ^1.2.1
//   geolocator: ^12.0.0
//   flutter_map: ^7.0.2
//   latlong2: ^0.9.1
//   permission_handler: ^11.3.1
//   flutter_map_marker_popup: ^5.0.0
//   cached_network_image: ^3.3.1
//   intl: ^0.19.0
//
// AndroidManifest.xml (inside <manifest>):
//   <uses-permission android:name="android.permission.ACCESS_FINE_LOCATION"/>
//   <uses-permission android:name="android.permission.ACCESS_COARSE_LOCATION"/>
//   <uses-permission android:name="android.permission.INTERNET"/>
//
// iOS Info.plist:
//   NSLocationWhenInUseUsageDescription → "We use your location to show nearby city zones."
//   NSLocationAlwaysUsageDescription → "We use your location to show nearby city zones."
// ============================================================

import 'dart:async';
import 'dart:convert';
import 'package:flutter/material.dart';
import 'package:flutter_map/flutter_map.dart';
import 'package:geolocator/geolocator.dart';
import 'package:http/http.dart' as http;
import 'package:intl/intl.dart';
import 'package:latlong2/latlong.dart';
import 'package:permission_handler/permission_handler.dart';

// ── CONFIG ────────────────────────────────────────────────────────────────────
// Change this to your FastAPI backend URL
const String kBaseUrl = 'http://10.0.2.2:8000'; // Android emulator → localhost

void main() {
  runApp(const NexaCityApp());
}

// ══════════════════════════════════════════════════════════════════════════════
// ROOT APP
// ══════════════════════════════════════════════════════════════════════════════
class NexaCityApp extends StatelessWidget {
  const NexaCityApp({super.key});

  @override
  Widget build(BuildContext context) {
    return MaterialApp(
      title: 'RSOC NexaCity',
      debugShowCheckedModeBanner: false,
      theme: _buildTheme(),
      home: const MainShell(),
    );
  }

  ThemeData _buildTheme() {
    const bg = Color(0xFF0A0E1A);
    const surface = Color(0xFF111827);
    const surface2 = Color(0xFF1A2235);
    const accent = Color(0xFFA855F7);
    const cyan = Color(0xFF00E5FF);
    const textPrimary = Color(0xFFE2E8F0);
    const textMuted = Color(0xFF64748B);

    return ThemeData(
      brightness: Brightness.dark,
      scaffoldBackgroundColor: bg,
      colorScheme: const ColorScheme.dark(
        primary: accent,
        secondary: cyan,
        surface: surface,
        onSurface: textPrimary,
      ),
      appBarTheme: const AppBarTheme(
        backgroundColor: surface,
        foregroundColor: textPrimary,
        elevation: 0,
        centerTitle: false,
      ),
      cardTheme: CardTheme(
        color: surface2,
        elevation: 0,
        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
      ),
      textTheme: const TextTheme(
        bodyMedium: TextStyle(color: textPrimary),
        bodySmall: TextStyle(color: textMuted),
        labelSmall: TextStyle(color: textMuted, letterSpacing: 1.2),
      ),
      useMaterial3: true,
    );
  }
}

// ══════════════════════════════════════════════════════════════════════════════
// MODELS
// ══════════════════════════════════════════════════════════════════════════════
class Zone {
  final String id, name, type, status;
  final double lat, lon, healthScore;
  final bool hasAlert;
  final Map<String, double> latest;

  const Zone({
    required this.id,
    required this.name,
    required this.type,
    required this.status,
    required this.lat,
    required this.lon,
    required this.healthScore,
    required this.hasAlert,
    required this.latest,
  });

  factory Zone.fromJson(Map<String, dynamic> j) => Zone(
        id: j['zone_id'],
        name: j['zone_name'],
        type: j['zone_type'],
        status: j['status'],
        lat: (j['lat'] as num).toDouble(),
        lon: (j['lon'] as num).toDouble(),
        healthScore: (j['health_score'] as num).toDouble(),
        hasAlert: j['has_alert'] ?? false,
        latest: {
          'traffic': (j['latest']['traffic_index'] as num).toDouble(),
          'aqi': (j['latest']['aqi'] as num).toDouble(),
          'energy': (j['latest']['energy_kwh'] as num).toDouble(),
          'water': (j['latest']['water_liters'] as num).toDouble(),
          'transport': (j['latest']['transport_ridership'] as num).toDouble(),
        },
      );

  Color get statusColor {
    switch (status) {
      case 'critical':
        return const Color(0xFFFF3B3B);
      case 'warning':
        return const Color(0xFFFFD60A);
      default:
        return const Color(0xFF30D158);
    }
  }
}

class IssueReport {
  final String id, category, description, zoneId;
  final double lat, lon;
  final DateTime timestamp;
  final String status; // pending / resolved

  IssueReport({
    required this.id,
    required this.category,
    required this.description,
    required this.zoneId,
    required this.lat,
    required this.lon,
    required this.timestamp,
    this.status = 'pending',
  });

  Map<String, dynamic> toJson() => {
        'id': id,
        'category': category,
        'description': description,
        'zone_id': zoneId,
        'lat': lat,
        'lon': lon,
        'timestamp': timestamp.toIso8601String(),
        'status': status,
      };

  factory IssueReport.fromJson(Map<String, dynamic> j) => IssueReport(
        id: j['id'],
        category: j['category'],
        description: j['description'],
        zoneId: j['zone_id'] ?? '',
        lat: (j['lat'] as num).toDouble(),
        lon: (j['lon'] as num).toDouble(),
        timestamp: DateTime.parse(j['timestamp']),
        status: j['status'] ?? 'pending',
      );

  Color get categoryColor {
    switch (category) {
      case 'Traffic':
        return Colors.orange;
      case 'AQI / Air Quality':
        return Colors.red;
      case 'Water':
        return Colors.blue;
      case 'Energy / Power':
        return Colors.yellow;
      case 'Waste / Sanitation':
        return Colors.green;
      default:
        return Colors.purple;
    }
  }

  IconData get categoryIcon {
    switch (category) {
      case 'Traffic':
        return Icons.directions_car;
      case 'AQI / Air Quality':
        return Icons.air;
      case 'Water':
        return Icons.water_drop;
      case 'Energy / Power':
        return Icons.bolt;
      case 'Waste / Sanitation':
        return Icons.delete_outline;
      default:
        return Icons.report_problem;
    }
  }
}

// ══════════════════════════════════════════════════════════════════════════════
// API SERVICE
// ══════════════════════════════════════════════════════════════════════════════
class ApiService {
  static Future<List<Zone>> fetchZones() async {
    final res = await http.get(Uri.parse('$kBaseUrl/api/zones'));
    if (res.statusCode == 200) {
      final List data = jsonDecode(res.body);
      return data.map((j) => Zone.fromJson(j)).toList();
    }
    throw Exception('Failed to load zones');
  }

  static Future<Map<String, dynamic>> fetchSummary() async {
    final res = await http.get(Uri.parse('$kBaseUrl/api/summary'));
    if (res.statusCode == 200) return jsonDecode(res.body);
    throw Exception('Failed to load summary');
  }

  static Future<List<dynamic>> fetchAnomalies() async {
    final res = await http.get(Uri.parse('$kBaseUrl/api/anomalies'));
    if (res.statusCode == 200) return jsonDecode(res.body);
    throw Exception('Failed to load anomalies');
  }

  // POST a new issue report to backend
  static Future<bool> postIssueReport(IssueReport report) async {
    try {
      final res = await http.post(
        Uri.parse('$kBaseUrl/api/reports'),
        headers: {'Content-Type': 'application/json'},
        body: jsonEncode(report.toJson()),
      );
      return res.statusCode == 200 || res.statusCode == 201;
    } catch (_) {
      return false; // offline — stored locally
    }
  }
}

// ══════════════════════════════════════════════════════════════════════════════
// APP STATE
// ══════════════════════════════════════════════════════════════════════════════
class AppState extends ChangeNotifier {
  List<Zone> zones = [];
  List<IssueReport> reports = [];
  Map<String, dynamic> summary = {};
  Position? userPosition;
  bool locationEnabled = false;
  bool loading = true;
  String? error;
  Timer? _refreshTimer;

  AppState() {
    _load();
    _refreshTimer = Timer.periodic(const Duration(seconds: 30), (_) => _load());
  }

  Future<void> _load() async {
    try {
      final z = await ApiService.fetchZones();
      final s = await ApiService.fetchSummary();
      zones = z;
      summary = s;
      error = null;
    } catch (e) {
      error = e.toString();
    }
    loading = false;
    notifyListeners();
  }

  Future<void> toggleLocation() async {
    if (locationEnabled) {
      locationEnabled = false;
      userPosition = null;
      notifyListeners();
      return;
    }

    final perm = await Permission.locationWhenInUse.request();
    if (perm.isGranted) {
      try {
        final pos = await Geolocator.getCurrentPosition(
            desiredAccuracy: LocationAccuracy.high);
        userPosition = pos;
        locationEnabled = true;
      } catch (_) {
        locationEnabled = false;
      }
    }
    notifyListeners();
  }

  void addReport(IssueReport r) {
    reports.insert(0, r);
    ApiService.postIssueReport(r); // fire & forget
    notifyListeners();
  }

  Future<void> refresh() => _load();

  @override
  void dispose() {
    _refreshTimer?.cancel();
    super.dispose();
  }
}

// ══════════════════════════════════════════════════════════════════════════════
// MAIN SHELL — Bottom nav
// ══════════════════════════════════════════════════════════════════════════════
class MainShell extends StatefulWidget {
  const MainShell({super.key});

  @override
  State<MainShell> createState() => _MainShellState();
}

class _MainShellState extends State<MainShell> {
  int _tab = 0;
  late final AppState _state;

  @override
  void initState() {
    super.initState();
    _state = AppState();
  }

  @override
  void dispose() {
    _state.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    return AnimatedBuilder(
      animation: _state,
      builder: (ctx, _) {
        final pages = [
          MapPage(state: _state),
          DashboardPage(state: _state),
          ReportPage(state: _state),
          AlertsPage(state: _state),
        ];

        return Scaffold(
          body: pages[_tab],
          bottomNavigationBar: NavigationBar(
            backgroundColor: const Color(0xFF111827),
            indicatorColor: const Color(0xFFA855F7).withOpacity(0.2),
            selectedIndex: _tab,
            onDestinationSelected: (i) => setState(() => _tab = i),
            destinations: const [
              NavigationDestination(
                icon: Icon(Icons.map_outlined),
                selectedIcon: Icon(Icons.map, color: Color(0xFFA855F7)),
                label: 'Map',
              ),
              NavigationDestination(
                icon: Icon(Icons.dashboard_outlined),
                selectedIcon: Icon(Icons.dashboard, color: Color(0xFFA855F7)),
                label: 'Zones',
              ),
              NavigationDestination(
                icon: Icon(Icons.add_circle_outline),
                selectedIcon: Icon(Icons.add_circle, color: Color(0xFFA855F7)),
                label: 'Report',
              ),
              NavigationDestination(
                icon: Icon(Icons.notifications_outlined),
                selectedIcon:
                    Icon(Icons.notifications, color: Color(0xFFA855F7)),
                label: 'Alerts',
              ),
            ],
          ),
        );
      },
    );
  }
}

// ══════════════════════════════════════════════════════════════════════════════
// PAGE 1 — MAP
// ══════════════════════════════════════════════════════════════════════════════
class MapPage extends StatefulWidget {
  final AppState state;
  const MapPage({super.key, required this.state});

  @override
  State<MapPage> createState() => _MapPageState();
}

class _MapPageState extends State<MapPage> {
  Zone? _selected;
  final MapController _mapCtrl = MapController();

  @override
  Widget build(BuildContext context) {
    final s = widget.state;
    final center = s.userPosition != null
        ? LatLng(s.userPosition!.latitude, s.userPosition!.longitude)
        : const LatLng(21.1458, 79.0882); // Nagpur default

    return Stack(
      children: [
        // ── Map ──────────────────────────────────────────────────────────────
        FlutterMap(
          mapController: _mapCtrl,
          options: MapOptions(
            initialCenter: center,
            initialZoom: 12.5,
            onTap: (_, __) => setState(() => _selected = null),
          ),
          children: [
            TileLayer(
              urlTemplate: 'https://tile.openstreetmap.org/{z}/{x}/{y}.png',
              userAgentPackageName: 'com.rsoc.nexacity',
            ),
            // Zone markers
            MarkerLayer(
              markers: [
                // User location
                if (s.userPosition != null)
                  Marker(
                    point: LatLng(
                        s.userPosition!.latitude, s.userPosition!.longitude),
                    width: 20,
                    height: 20,
                    child: Container(
                      decoration: BoxDecoration(
                        color: const Color(0xFF00E5FF),
                        shape: BoxShape.circle,
                        border: Border.all(color: Colors.white, width: 2),
                        boxShadow: [
                          BoxShadow(
                            color: const Color(0xFF00E5FF).withOpacity(0.5),
                            blurRadius: 8,
                            spreadRadius: 2,
                          )
                        ],
                      ),
                    ),
                  ),
                // Zone markers
                ...s.zones.map((z) => Marker(
                      point: LatLng(z.lat, z.lon),
                      width: 52,
                      height: 52,
                      child: GestureDetector(
                        onTap: () => setState(() => _selected = z),
                        child: _ZoneMarker(zone: z, selected: _selected?.id == z.id),
                      ),
                    )),
                // User-reported issues
                ...s.reports.map((r) => Marker(
                      point: LatLng(r.lat, r.lon),
                      width: 36,
                      height: 36,
                      child: GestureDetector(
                        onTap: () => _showReportSheet(r),
                        child: _IssueMarker(report: r),
                      ),
                    )),
              ],
            ),
          ],
        ),

        // ── Top bar ──────────────────────────────────────────────────────────
        SafeArea(
          child: Padding(
            padding: const EdgeInsets.all(12),
            child: Row(
              children: [
                // Title chip
                Container(
                  padding:
                      const EdgeInsets.symmetric(horizontal: 14, vertical: 8),
                  decoration: BoxDecoration(
                    color: const Color(0xFF111827).withOpacity(0.92),
                    borderRadius: BorderRadius.circular(20),
                    border: Border.all(
                        color: const Color(0xFFA855F7).withOpacity(0.4)),
                  ),
                  child: Row(
                    mainAxisSize: MainAxisSize.min,
                    children: [
                      const Icon(Icons.location_city,
                          color: Color(0xFFA855F7), size: 16),
                      const SizedBox(width: 6),
                      Text(
                        'RSOC NexaCity',
                        style: Theme.of(context).textTheme.bodyMedium?.copyWith(
                              fontWeight: FontWeight.bold,
                              color: Colors.white,
                            ),
                      ),
                    ],
                  ),
                ),
                const Spacer(),
                // Location toggle
                _LocationToggle(state: s),
                const SizedBox(width: 8),
                // Refresh
                _MapIconBtn(
                  icon: Icons.refresh,
                  onTap: s.refresh,
                ),
              ],
            ),
          ),
        ),

        // ── Legend ───────────────────────────────────────────────────────────
        Positioned(
          left: 12,
          bottom: 90,
          child: _MapLegend(),
        ),

        // ── Zone detail card ─────────────────────────────────────────────────
        if (_selected != null)
          Positioned(
            bottom: 80,
            left: 12,
            right: 12,
            child: _ZoneDetailCard(
              zone: _selected!,
              onClose: () => setState(() => _selected = null),
              onReport: () => _openReportForZone(_selected!),
            ),
          ),

        // ── Loading ───────────────────────────────────────────────────────────
        if (s.loading)
          const Center(child: CircularProgressIndicator()),
      ],
    );
  }

  void _showReportSheet(IssueReport r) {
    showModalBottomSheet(
      context: context,
      backgroundColor: const Color(0xFF1A2235),
      shape: const RoundedRectangleBorder(
          borderRadius: BorderRadius.vertical(top: Radius.circular(20))),
      builder: (_) => _ReportDetailSheet(report: r),
    );
  }

  void _openReportForZone(Zone z) {
    Navigator.push(
      context,
      MaterialPageRoute(
        builder: (_) => ReportFormPage(state: widget.state, preselectedZone: z),
      ),
    );
  }
}

// ── Zone marker widget ───────────────────────────────────────────────────────
class _ZoneMarker extends StatelessWidget {
  final Zone zone;
  final bool selected;
  const _ZoneMarker({required this.zone, required this.selected});

  @override
  Widget build(BuildContext context) {
    return AnimatedContainer(
      duration: const Duration(milliseconds: 200),
      width: selected ? 52 : 44,
      height: selected ? 52 : 44,
      decoration: BoxDecoration(
        color: zone.statusColor.withOpacity(0.15),
        shape: BoxShape.circle,
        border: Border.all(
          color: zone.statusColor,
          width: selected ? 3 : 2,
        ),
        boxShadow: [
          BoxShadow(
            color: zone.statusColor.withOpacity(selected ? 0.6 : 0.3),
            blurRadius: selected ? 16 : 8,
            spreadRadius: selected ? 2 : 0,
          )
        ],
      ),
      child: Center(
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            Text(
              zone.healthScore.toStringAsFixed(0),
              style: TextStyle(
                color: zone.statusColor,
                fontSize: 11,
                fontWeight: FontWeight.bold,
              ),
            ),
            if (zone.hasAlert)
              const Icon(Icons.warning_amber_rounded,
                  color: Colors.orange, size: 10),
          ],
        ),
      ),
    );
  }
}

// ── Issue marker widget ──────────────────────────────────────────────────────
class _IssueMarker extends StatelessWidget {
  final IssueReport report;
  const _IssueMarker({required this.report});

  @override
  Widget build(BuildContext context) {
    return Container(
      decoration: BoxDecoration(
        color: report.categoryColor.withOpacity(0.2),
        shape: BoxShape.circle,
        border: Border.all(color: report.categoryColor, width: 2),
      ),
      child: Icon(report.categoryIcon, color: report.categoryColor, size: 18),
    );
  }
}

// ── Map icon button ──────────────────────────────────────────────────────────
class _MapIconBtn extends StatelessWidget {
  final IconData icon;
  final VoidCallback onTap;
  const _MapIconBtn({required this.icon, required this.onTap});

  @override
  Widget build(BuildContext context) {
    return GestureDetector(
      onTap: onTap,
      child: Container(
        width: 40,
        height: 40,
        decoration: BoxDecoration(
          color: const Color(0xFF111827).withOpacity(0.92),
          shape: BoxShape.circle,
          border: Border.all(color: Colors.white12),
        ),
        child: Icon(icon, color: Colors.white70, size: 20),
      ),
    );
  }
}

// ── Location toggle ──────────────────────────────────────────────────────────
class _LocationToggle extends StatelessWidget {
  final AppState state;
  const _LocationToggle({required this.state});

  @override
  Widget build(BuildContext context) {
    return GestureDetector(
      onTap: state.toggleLocation,
      child: Container(
        padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 8),
        decoration: BoxDecoration(
          color: state.locationEnabled
              ? const Color(0xFF00E5FF).withOpacity(0.15)
              : const Color(0xFF111827).withOpacity(0.92),
          borderRadius: BorderRadius.circular(20),
          border: Border.all(
            color: state.locationEnabled
                ? const Color(0xFF00E5FF)
                : Colors.white24,
          ),
        ),
        child: Row(
          mainAxisSize: MainAxisSize.min,
          children: [
            Icon(
              state.locationEnabled
                  ? Icons.my_location
                  : Icons.location_disabled,
              color: state.locationEnabled
                  ? const Color(0xFF00E5FF)
                  : Colors.white38,
              size: 16,
            ),
            const SizedBox(width: 6),
            Text(
              state.locationEnabled ? 'ON' : 'OFF',
              style: TextStyle(
                color: state.locationEnabled
                    ? const Color(0xFF00E5FF)
                    : Colors.white38,
                fontWeight: FontWeight.bold,
                fontSize: 12,
              ),
            ),
          ],
        ),
      ),
    );
  }
}

// ── Legend ───────────────────────────────────────────────────────────────────
class _MapLegend extends StatelessWidget {
  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.all(10),
      decoration: BoxDecoration(
        color: const Color(0xFF111827).withOpacity(0.9),
        borderRadius: BorderRadius.circular(10),
        border: Border.all(color: Colors.white12),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          _legendRow(const Color(0xFF30D158), 'Good (≥65)'),
          const SizedBox(height: 4),
          _legendRow(const Color(0xFFFFD60A), 'Warning (40–64)'),
          const SizedBox(height: 4),
          _legendRow(const Color(0xFFFF3B3B), 'Critical (<40)'),
          const SizedBox(height: 4),
          _legendRow(const Color(0xFF00E5FF), 'Your location'),
        ],
      ),
    );
  }

  Widget _legendRow(Color color, String label) => Row(
        children: [
          Container(
              width: 10, height: 10, decoration: BoxDecoration(color: color, shape: BoxShape.circle)),
          const SizedBox(width: 6),
          Text(label,
              style: const TextStyle(color: Colors.white70, fontSize: 10)),
        ],
      );
}

// ── Zone detail card ─────────────────────────────────────────────────────────
class _ZoneDetailCard extends StatelessWidget {
  final Zone zone;
  final VoidCallback onClose;
  final VoidCallback onReport;

  const _ZoneDetailCard(
      {required this.zone, required this.onClose, required this.onReport});

  @override
  Widget build(BuildContext context) {
    return Card(
      child: Padding(
        padding: const EdgeInsets.all(14),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Row(
              children: [
                Container(
                  width: 10,
                  height: 10,
                  decoration: BoxDecoration(
                      color: zone.statusColor, shape: BoxShape.circle),
                ),
                const SizedBox(width: 8),
                Expanded(
                  child: Text(zone.name,
                      style: const TextStyle(
                          fontWeight: FontWeight.bold, fontSize: 16)),
                ),
                IconButton(
                    icon: const Icon(Icons.close, size: 18),
                    onPressed: onClose,
                    padding: EdgeInsets.zero,
                    constraints: const BoxConstraints()),
              ],
            ),
            Text(
              '${zone.type.toUpperCase()} · Health: ${zone.healthScore.toStringAsFixed(1)}',
              style: Theme.of(context).textTheme.bodySmall,
            ),
            const SizedBox(height: 12),
            Row(
              children: [
                _MetricChip('🚗', '${zone.latest['traffic']!.toStringAsFixed(0)}', 'Traffic'),
                _MetricChip('🌫️', '${zone.latest['aqi']!.toStringAsFixed(0)}', 'AQI'),
                _MetricChip('⚡', '${zone.latest['energy']!.toStringAsFixed(0)}', 'kWh'),
                _MetricChip('💧', '${zone.latest['water']!.toStringAsFixed(0)}', 'L/hr'),
              ],
            ),
            const SizedBox(height: 12),
            SizedBox(
              width: double.infinity,
              child: ElevatedButton.icon(
                style: ElevatedButton.styleFrom(
                  backgroundColor: const Color(0xFFA855F7).withOpacity(0.2),
                  foregroundColor: const Color(0xFFA855F7),
                  side: const BorderSide(color: Color(0xFFA855F7)),
                  shape: RoundedRectangleBorder(
                      borderRadius: BorderRadius.circular(8)),
                ),
                icon: const Icon(Icons.flag_outlined, size: 16),
                label: const Text('Report Issue Here'),
                onPressed: onReport,
              ),
            )
          ],
        ),
      ),
    );
  }
}

class _MetricChip extends StatelessWidget {
  final String emoji, value, label;
  const _MetricChip(this.emoji, this.value, this.label);

  @override
  Widget build(BuildContext context) {
    return Expanded(
      child: Column(
        children: [
          Text(emoji, style: const TextStyle(fontSize: 16)),
          Text(value,
              style: const TextStyle(
                  fontWeight: FontWeight.bold,
                  fontSize: 13,
                  color: Colors.white)),
          Text(label,
              style: const TextStyle(fontSize: 9, color: Colors.white54)),
        ],
      ),
    );
  }
}

// ══════════════════════════════════════════════════════════════════════════════
// PAGE 2 — DASHBOARD
// ══════════════════════════════════════════════════════════════════════════════
class DashboardPage extends StatelessWidget {
  final AppState state;
  const DashboardPage({super.key, required this.state});

  @override
  Widget build(BuildContext context) {
    final s = state.summary;
    return Scaffold(
      appBar: AppBar(
        title: const Text('Zone Dashboard',
            style: TextStyle(fontWeight: FontWeight.bold)),
        actions: [
          IconButton(
              icon: const Icon(Icons.refresh),
              onPressed: state.refresh),
        ],
      ),
      body: state.loading
          ? const Center(child: CircularProgressIndicator())
          : state.error != null
              ? _ErrorWidget(onRetry: state.refresh)
              : CustomScrollView(
                  slivers: [
                    // Summary cards
                    SliverToBoxAdapter(
                      child: Padding(
                        padding: const EdgeInsets.all(16),
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            const Text('CITY OVERVIEW',
                                style: TextStyle(
                                    color: Color(0xFF64748B),
                                    letterSpacing: 1.5,
                                    fontSize: 11)),
                            const SizedBox(height: 10),
                            Row(
                              children: [
                                _SummaryCard(
                                    label: 'Avg Health',
                                    value:
                                        '${s['avg_city_health'] ?? '--'}',
                                    color: const Color(0xFF30D158),
                                    icon: Icons.favorite),
                                const SizedBox(width: 10),
                                _SummaryCard(
                                    label: 'Critical',
                                    value:
                                        '${s['critical_zones'] ?? 0}',
                                    color: const Color(0xFFFF3B3B),
                                    icon: Icons.warning),
                                const SizedBox(width: 10),
                                _SummaryCard(
                                    label: 'Warnings',
                                    value:
                                        '${s['warning_zones'] ?? 0}',
                                    color: const Color(0xFFFFD60A),
                                    icon: Icons.info_outline),
                              ],
                            ),
                            const SizedBox(height: 20),
                            const Text('ALL ZONES',
                                style: TextStyle(
                                    color: Color(0xFF64748B),
                                    letterSpacing: 1.5,
                                    fontSize: 11)),
                          ],
                        ),
                      ),
                    ),
                    // Zone list
                    SliverList(
                      delegate: SliverChildBuilderDelegate(
                        (ctx, i) => _ZoneListTile(zone: state.zones[i]),
                        childCount: state.zones.length,
                      ),
                    ),
                    const SliverToBoxAdapter(child: SizedBox(height: 20)),
                  ],
                ),
    );
  }
}

class _SummaryCard extends StatelessWidget {
  final String label, value;
  final Color color;
  final IconData icon;

  const _SummaryCard(
      {required this.label,
      required this.value,
      required this.color,
      required this.icon});

  @override
  Widget build(BuildContext context) {
    return Expanded(
      child: Container(
        padding: const EdgeInsets.all(14),
        decoration: BoxDecoration(
          color: color.withOpacity(0.08),
          borderRadius: BorderRadius.circular(12),
          border: Border.all(color: color.withOpacity(0.3)),
        ),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Icon(icon, color: color, size: 20),
            const SizedBox(height: 8),
            Text(value,
                style: TextStyle(
                    color: color,
                    fontSize: 22,
                    fontWeight: FontWeight.bold)),
            Text(label,
                style: const TextStyle(color: Colors.white54, fontSize: 11)),
          ],
        ),
      ),
    );
  }
}

class _ZoneListTile extends StatelessWidget {
  final Zone zone;
  const _ZoneListTile({required this.zone});

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 5),
      child: Container(
        decoration: BoxDecoration(
          color: const Color(0xFF1A2235),
          borderRadius: BorderRadius.circular(12),
          border: Border.all(
            color: zone.hasAlert
                ? zone.statusColor.withOpacity(0.5)
                : Colors.white10,
          ),
        ),
        child: ListTile(
          contentPadding:
              const EdgeInsets.symmetric(horizontal: 16, vertical: 6),
          leading: Stack(
            children: [
              Container(
                width: 44,
                height: 44,
                decoration: BoxDecoration(
                  color: zone.statusColor.withOpacity(0.1),
                  shape: BoxShape.circle,
                  border: Border.all(color: zone.statusColor, width: 1.5),
                ),
                child: Center(
                  child: Text(
                    zone.healthScore.toStringAsFixed(0),
                    style: TextStyle(
                        color: zone.statusColor,
                        fontWeight: FontWeight.bold,
                        fontSize: 14),
                  ),
                ),
              ),
              if (zone.hasAlert)
                Positioned(
                  right: 0,
                  top: 0,
                  child: Container(
                    width: 12,
                    height: 12,
                    decoration: const BoxDecoration(
                        color: Colors.orange, shape: BoxShape.circle),
                  ),
                ),
            ],
          ),
          title: Text(zone.name,
              style: const TextStyle(fontWeight: FontWeight.w600)),
          subtitle: Text(
            '${zone.type} · ${zone.status.toUpperCase()}',
            style: TextStyle(color: zone.statusColor, fontSize: 11),
          ),
          trailing: Column(
            mainAxisAlignment: MainAxisAlignment.center,
            crossAxisAlignment: CrossAxisAlignment.end,
            children: [
              Text('AQI ${zone.latest['aqi']!.toStringAsFixed(0)}',
                  style:
                      const TextStyle(color: Colors.white70, fontSize: 12)),
              Text('🚗 ${zone.latest['traffic']!.toStringAsFixed(0)}',
                  style:
                      const TextStyle(color: Colors.white54, fontSize: 11)),
            ],
          ),
        ),
      ),
    );
  }
}

// ══════════════════════════════════════════════════════════════════════════════
// PAGE 3 — REPORT ISSUE
// ══════════════════════════════════════════════════════════════════════════════
class ReportPage extends StatelessWidget {
  final AppState state;
  const ReportPage({super.key, required this.state});

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: const Text('My Reports',
            style: TextStyle(fontWeight: FontWeight.bold)),
        actions: [
          TextButton.icon(
            icon: const Icon(Icons.add, color: Color(0xFFA855F7)),
            label: const Text('New',
                style: TextStyle(color: Color(0xFFA855F7))),
            onPressed: () => Navigator.push(
              context,
              MaterialPageRoute(
                  builder: (_) => ReportFormPage(state: state)),
            ),
          ),
        ],
      ),
      body: state.reports.isEmpty
          ? _EmptyReports(
              onAdd: () => Navigator.push(
                context,
                MaterialPageRoute(
                    builder: (_) => ReportFormPage(state: state)),
              ),
            )
          : ListView.builder(
              padding:
                  const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
              itemCount: state.reports.length,
              itemBuilder: (_, i) => _ReportCard(report: state.reports[i]),
            ),
    );
  }
}

class _EmptyReports extends StatelessWidget {
  final VoidCallback onAdd;
  const _EmptyReports({required this.onAdd});

  @override
  Widget build(BuildContext context) {
    return Center(
      child: Column(
        mainAxisAlignment: MainAxisAlignment.center,
        children: [
          const Icon(Icons.flag_outlined, size: 64, color: Colors.white24),
          const SizedBox(height: 16),
          const Text('No reports yet',
              style: TextStyle(color: Colors.white54, fontSize: 16)),
          const SizedBox(height: 8),
          const Text('Tap below to report an issue in your area',
              style: TextStyle(color: Colors.white38, fontSize: 12)),
          const SizedBox(height: 24),
          ElevatedButton.icon(
            style: ElevatedButton.styleFrom(
              backgroundColor: const Color(0xFFA855F7),
              foregroundColor: Colors.white,
              shape: RoundedRectangleBorder(
                  borderRadius: BorderRadius.circular(10)),
            ),
            icon: const Icon(Icons.add),
            label: const Text('Report Issue'),
            onPressed: onAdd,
          ),
        ],
      ),
    );
  }
}

class _ReportCard extends StatelessWidget {
  final IssueReport report;
  const _ReportCard({required this.report});

  @override
  Widget build(BuildContext context) {
    return Container(
      margin: const EdgeInsets.only(bottom: 10),
      padding: const EdgeInsets.all(14),
      decoration: BoxDecoration(
        color: const Color(0xFF1A2235),
        borderRadius: BorderRadius.circular(12),
        border: Border.all(
            color: report.categoryColor.withOpacity(0.3)),
      ),
      child: Row(
        children: [
          Container(
            width: 44,
            height: 44,
            decoration: BoxDecoration(
              color: report.categoryColor.withOpacity(0.15),
              shape: BoxShape.circle,
            ),
            child: Icon(report.categoryIcon,
                color: report.categoryColor, size: 22),
          ),
          const SizedBox(width: 12),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(report.category,
                    style: const TextStyle(
                        fontWeight: FontWeight.bold, fontSize: 14)),
                if (report.description.isNotEmpty)
                  Padding(
                    padding: const EdgeInsets.only(top: 2),
                    child: Text(report.description,
                        maxLines: 2,
                        overflow: TextOverflow.ellipsis,
                        style: const TextStyle(
                            color: Colors.white60, fontSize: 12)),
                  ),
                const SizedBox(height: 4),
                Text(
                  DateFormat('MMM d, yyyy · HH:mm')
                      .format(report.timestamp),
                  style: const TextStyle(
                      color: Colors.white38, fontSize: 10),
                ),
              ],
            ),
          ),
          Container(
            padding:
                const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
            decoration: BoxDecoration(
              color: report.status == 'pending'
                  ? Colors.orange.withOpacity(0.15)
                  : Colors.green.withOpacity(0.15),
              borderRadius: BorderRadius.circular(6),
            ),
            child: Text(
              report.status.toUpperCase(),
              style: TextStyle(
                color: report.status == 'pending'
                    ? Colors.orange
                    : Colors.green,
                fontSize: 9,
                fontWeight: FontWeight.bold,
                letterSpacing: 1,
              ),
            ),
          ),
        ],
      ),
    );
  }
}

// ── Report Form Page ─────────────────────────────────────────────────────────
class ReportFormPage extends StatefulWidget {
  final AppState state;
  final Zone? preselectedZone;

  const ReportFormPage({super.key, required this.state, this.preselectedZone});

  @override
  State<ReportFormPage> createState() => _ReportFormPageState();
}

class _ReportFormPageState extends State<ReportFormPage> {
  final _descCtrl = TextEditingController();
  String _category = 'Traffic';
  String? _zoneId;
  bool _submitting = false;

  static const _categories = [
    'Traffic',
    'AQI / Air Quality',
    'Water',
    'Energy / Power',
    'Waste / Sanitation',
    'Other',
  ];

  @override
  void initState() {
    super.initState();
    _zoneId = widget.preselectedZone?.id;
  }

  @override
  void dispose() {
    _descCtrl.dispose();
    super.dispose();
  }

  Future<void> _submit() async {
    final s = widget.state;
    final pos = s.userPosition;

    // Use zone center if no GPS
    double lat = 21.1458, lon = 79.0882;
    if (pos != null) {
      lat = pos.latitude;
      lon = pos.longitude;
    } else if (_zoneId != null) {
      final z = s.zones.firstWhere((z) => z.id == _zoneId,
          orElse: () => s.zones.first);
      lat = z.lat;
      lon = z.lon;
    }

    setState(() => _submitting = true);

    final report = IssueReport(
      id: DateTime.now().millisecondsSinceEpoch.toString(),
      category: _category,
      description: _descCtrl.text.trim(),
      zoneId: _zoneId ?? '',
      lat: lat,
      lon: lon,
      timestamp: DateTime.now(),
    );

    s.addReport(report);
    await Future.delayed(const Duration(milliseconds: 500));

    if (mounted) {
      setState(() => _submitting = false);
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(
          content: Text('✅ Issue reported successfully'),
          backgroundColor: Color(0xFF30D158),
        ),
      );
      Navigator.pop(context);
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: const Text('Report an Issue',
            style: TextStyle(fontWeight: FontWeight.bold)),
      ),
      body: SingleChildScrollView(
        padding: const EdgeInsets.all(20),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            // Location indicator
            Container(
              padding: const EdgeInsets.all(14),
              decoration: BoxDecoration(
                color: widget.state.locationEnabled
                    ? const Color(0xFF00E5FF).withOpacity(0.08)
                    : Colors.white.withOpacity(0.04),
                borderRadius: BorderRadius.circular(12),
                border: Border.all(
                  color: widget.state.locationEnabled
                      ? const Color(0xFF00E5FF).withOpacity(0.4)
                      : Colors.white12,
                ),
              ),
              child: Row(
                children: [
                  Icon(
                    widget.state.locationEnabled
                        ? Icons.my_location
                        : Icons.location_off,
                    color: widget.state.locationEnabled
                        ? const Color(0xFF00E5FF)
                        : Colors.white38,
                    size: 20,
                  ),
                  const SizedBox(width: 10),
                  Expanded(
                    child: Text(
                      widget.state.locationEnabled
                          ? 'Using your GPS location'
                          : 'Location off — using zone center',
                      style: TextStyle(
                        color: widget.state.locationEnabled
                            ? const Color(0xFF00E5FF)
                            : Colors.white38,
                        fontSize: 13,
                      ),
                    ),
                  ),
                ],
              ),
            ),
            const SizedBox(height: 20),

            // Category
            _label('ISSUE CATEGORY'),
            const SizedBox(height: 8),
            Wrap(
              spacing: 8,
              runSpacing: 8,
              children: _categories
                  .map((c) => GestureDetector(
                        onTap: () => setState(() => _category = c),
                        child: AnimatedContainer(
                          duration: const Duration(milliseconds: 150),
                          padding: const EdgeInsets.symmetric(
                              horizontal: 14, vertical: 8),
                          decoration: BoxDecoration(
                            color: _category == c
                                ? const Color(0xFFA855F7).withOpacity(0.2)
                                : const Color(0xFF1A2235),
                            borderRadius: BorderRadius.circular(20),
                            border: Border.all(
                              color: _category == c
                                  ? const Color(0xFFA855F7)
                                  : Colors.white12,
                            ),
                          ),
                          child: Text(
                            c,
                            style: TextStyle(
                              color: _category == c
                                  ? const Color(0xFFA855F7)
                                  : Colors.white60,
                              fontSize: 13,
                              fontWeight: _category == c
                                  ? FontWeight.bold
                                  : FontWeight.normal,
                            ),
                          ),
                        ),
                      ))
                  .toList(),
            ),
            const SizedBox(height: 20),

            // Zone selector
            _label('ZONE (OPTIONAL)'),
            const SizedBox(height: 8),
            DropdownButtonFormField<String>(
              value: _zoneId,
              dropdownColor: const Color(0xFF1A2235),
              style: const TextStyle(color: Colors.white),
              decoration: InputDecoration(
                filled: true,
                fillColor: const Color(0xFF1A2235),
                border: OutlineInputBorder(
                  borderRadius: BorderRadius.circular(10),
                  borderSide: const BorderSide(color: Colors.white12),
                ),
                enabledBorder: OutlineInputBorder(
                  borderRadius: BorderRadius.circular(10),
                  borderSide: const BorderSide(color: Colors.white12),
                ),
                hintText: 'Select a zone',
                hintStyle: const TextStyle(color: Colors.white38),
              ),
              items: [
                const DropdownMenuItem<String>(
                  value: null,
                  child: Text('No specific zone',
                      style: TextStyle(color: Colors.white54)),
                ),
                ...widget.state.zones.map(
                  (z) => DropdownMenuItem<String>(
                    value: z.id,
                    child: Text('${z.id} – ${z.name}'),
                  ),
                ),
              ],
              onChanged: (v) => setState(() => _zoneId = v),
            ),
            const SizedBox(height: 20),

            // Description
            _label('DESCRIPTION'),
            const SizedBox(height: 8),
            TextFormField(
              controller: _descCtrl,
              maxLines: 4,
              style: const TextStyle(color: Colors.white),
              decoration: InputDecoration(
                filled: true,
                fillColor: const Color(0xFF1A2235),
                hintText: 'Describe the issue...',
                hintStyle: const TextStyle(color: Colors.white38),
                border: OutlineInputBorder(
                  borderRadius: BorderRadius.circular(10),
                  borderSide: const BorderSide(color: Colors.white12),
                ),
                enabledBorder: OutlineInputBorder(
                  borderRadius: BorderRadius.circular(10),
                  borderSide: const BorderSide(color: Colors.white12),
                ),
                focusedBorder: OutlineInputBorder(
                  borderRadius: BorderRadius.circular(10),
                  borderSide:
                      const BorderSide(color: Color(0xFFA855F7)),
                ),
              ),
            ),
            const SizedBox(height: 28),

            // Submit
            SizedBox(
              width: double.infinity,
              height: 50,
              child: ElevatedButton(
                style: ElevatedButton.styleFrom(
                  backgroundColor: const Color(0xFFA855F7),
                  foregroundColor: Colors.white,
                  shape: RoundedRectangleBorder(
                      borderRadius: BorderRadius.circular(12)),
                ),
                onPressed: _submitting ? null : _submit,
                child: _submitting
                    ? const SizedBox(
                        width: 20,
                        height: 20,
                        child: CircularProgressIndicator(
                            color: Colors.white, strokeWidth: 2),
                      )
                    : const Text('Submit Report',
                        style: TextStyle(
                            fontWeight: FontWeight.bold, fontSize: 16)),
              ),
            ),
          ],
        ),
      ),
    );
  }

  Widget _label(String text) => Text(
        text,
        style: const TextStyle(
            color: Color(0xFF64748B), fontSize: 11, letterSpacing: 1.5),
      );
}

// ══════════════════════════════════════════════════════════════════════════════
// PAGE 4 — ALERTS
// ══════════════════════════════════════════════════════════════════════════════
class AlertsPage extends StatefulWidget {
  final AppState state;
  const AlertsPage({super.key, required this.state});

  @override
  State<AlertsPage> createState() => _AlertsPageState();
}

class _AlertsPageState extends State<AlertsPage> {
  List<dynamic> _anomalies = [];
  bool _loading = true;

  @override
  void initState() {
    super.initState();
    _loadAnomalies();
  }

  Future<void> _loadAnomalies() async {
    try {
      final data = await ApiService.fetchAnomalies();
      setState(() {
        _anomalies = data;
        _loading = false;
      });
    } catch (_) {
      setState(() => _loading = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    final criticalZones = widget.state.zones
        .where((z) => z.status == 'critical')
        .toList();

    return Scaffold(
      appBar: AppBar(
        title: const Text('Alerts & Anomalies',
            style: TextStyle(fontWeight: FontWeight.bold)),
        actions: [
          IconButton(
            icon: const Icon(Icons.refresh),
            onPressed: _loadAnomalies,
          ),
        ],
      ),
      body: _loading
          ? const Center(child: CircularProgressIndicator())
          : ListView(
              padding:
                  const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
              children: [
                // Critical zones banner
                if (criticalZones.isNotEmpty) ...[
                  _sectionLabel('⚠️ CRITICAL ZONES'),
                  ...criticalZones.map((z) => _CriticalZoneTile(zone: z)),
                  const SizedBox(height: 8),
                ],

                // User reports
                if (widget.state.reports.isNotEmpty) ...[
                  _sectionLabel('📍 YOUR REPORTS'),
                  ...widget.state.reports
                      .take(5)
                      .map((r) => _UserReportTile(report: r)),
                  const SizedBox(height: 8),
                ],

                // Anomalies from backend
                _sectionLabel('🤖 ML ANOMALIES DETECTED'),
                if (_anomalies.isEmpty)
                  const Center(
                    child: Padding(
                      padding: EdgeInsets.all(24),
                      child: Text('No anomalies detected',
                          style: TextStyle(color: Colors.white38)),
                    ),
                  )
                else
                  ..._anomalies
                      .take(15)
                      .map((a) => _AnomalyTile(data: a)),
              ],
            ),
    );
  }

  Widget _sectionLabel(String text) => Padding(
        padding: const EdgeInsets.symmetric(vertical: 8),
        child: Text(
          text,
          style: const TextStyle(
              color: Color(0xFF64748B),
              fontSize: 11,
              letterSpacing: 1.5,
              fontWeight: FontWeight.bold),
        ),
      );
}

class _CriticalZoneTile extends StatelessWidget {
  final Zone zone;
  const _CriticalZoneTile({required this.zone});

  @override
  Widget build(BuildContext context) {
    return Container(
      margin: const EdgeInsets.only(bottom: 8),
      padding: const EdgeInsets.all(14),
      decoration: BoxDecoration(
        color: const Color(0xFFFF3B3B).withOpacity(0.06),
        borderRadius: BorderRadius.circular(12),
        border: Border.all(color: const Color(0xFFFF3B3B).withOpacity(0.4)),
      ),
      child: Row(
        children: [
          const Icon(Icons.warning_amber_rounded,
              color: Color(0xFFFF3B3B), size: 22),
          const SizedBox(width: 12),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(zone.name,
                    style: const TextStyle(
                        fontWeight: FontWeight.bold,
                        color: Color(0xFFFF3B3B))),
                Text(
                  'Health: ${zone.healthScore.toStringAsFixed(1)} · AQI: ${zone.latest['aqi']!.toStringAsFixed(0)}',
                  style:
                      const TextStyle(color: Colors.white54, fontSize: 12),
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }
}

class _UserReportTile extends StatelessWidget {
  final IssueReport report;
  const _UserReportTile({required this.report});

  @override
  Widget build(BuildContext context) {
    return Container(
      margin: const EdgeInsets.only(bottom: 8),
      padding: const EdgeInsets.all(12),
      decoration: BoxDecoration(
        color: report.categoryColor.withOpacity(0.06),
        borderRadius: BorderRadius.circular(12),
        border:
            Border.all(color: report.categoryColor.withOpacity(0.3)),
      ),
      child: Row(
        children: [
          Icon(report.categoryIcon,
              color: report.categoryColor, size: 20),
          const SizedBox(width: 12),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(report.category,
                    style: const TextStyle(fontWeight: FontWeight.w600)),
                if (report.description.isNotEmpty)
                  Text(report.description,
                      maxLines: 1,
                      overflow: TextOverflow.ellipsis,
                      style: const TextStyle(
                          color: Colors.white54, fontSize: 12)),
              ],
            ),
          ),
          Text(
            DateFormat('HH:mm').format(report.timestamp),
            style: const TextStyle(color: Colors.white38, fontSize: 11),
          ),
        ],
      ),
    );
  }
}

class _AnomalyTile extends StatelessWidget {
  final Map<String, dynamic> data;
  const _AnomalyTile({required this.data});

  @override
  Widget build(BuildContext context) {
    final score = (data['anomaly_score'] as num).toDouble();
    final isHigh = score > 0.3;

    return Container(
      margin: const EdgeInsets.only(bottom: 8),
      padding: const EdgeInsets.all(12),
      decoration: BoxDecoration(
        color: (isHigh ? Colors.red : Colors.orange).withOpacity(0.06),
        borderRadius: BorderRadius.circular(12),
        border: Border.all(
            color: (isHigh ? Colors.red : Colors.orange).withOpacity(0.3)),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: [
              Icon(Icons.auto_graph,
                  color: isHigh ? Colors.red : Colors.orange, size: 16),
              const SizedBox(width: 8),
              Expanded(
                child: Text(
                  data['zone_name'] ?? '',
                  style: const TextStyle(fontWeight: FontWeight.bold),
                ),
              ),
              Container(
                padding:
                    const EdgeInsets.symmetric(horizontal: 6, vertical: 2),
                decoration: BoxDecoration(
                  color:
                      (isHigh ? Colors.red : Colors.orange).withOpacity(0.15),
                  borderRadius: BorderRadius.circular(6),
                ),
                child: Text(
                  'Score: ${score.toStringAsFixed(3)}',
                  style: TextStyle(
                      color: isHigh ? Colors.red : Colors.orange,
                      fontSize: 10,
                      fontWeight: FontWeight.bold),
                ),
              ),
            ],
          ),
          const SizedBox(height: 6),
          Text(
            '${_metricLabel(data['top_metric'] ?? '')} anomaly · Value: ${data['value']}',
            style: const TextStyle(color: Colors.white60, fontSize: 12),
          ),
          const SizedBox(height: 2),
          Text(
            _formatTime(data['timestamp'] ?? ''),
            style: const TextStyle(color: Colors.white38, fontSize: 10),
          ),
        ],
      ),
    );
  }

  String _metricLabel(String m) {
    const labels = {
      'traffic_index': '🚗 Traffic',
      'aqi': '🌫️ AQI',
      'energy_kwh': '⚡ Energy',
      'water_liters': '💧 Water',
      'transport_ridership': '🚌 Transport',
    };
    return labels[m] ?? m;
  }

  String _formatTime(String iso) {
    try {
      return DateFormat('MMM d, HH:mm').format(DateTime.parse(iso));
    } catch (_) {
      return iso;
    }
  }
}

// ══════════════════════════════════════════════════════════════════════════════
// SHARED WIDGETS
// ══════════════════════════════════════════════════════════════════════════════
class _ErrorWidget extends StatelessWidget {
  final VoidCallback onRetry;
  const _ErrorWidget({required this.onRetry});

  @override
  Widget build(BuildContext context) {
    return Center(
      child: Column(
        mainAxisAlignment: MainAxisAlignment.center,
        children: [
          const Icon(Icons.cloud_off, size: 48, color: Colors.white24),
          const SizedBox(height: 12),
          const Text('Cannot reach backend',
              style: TextStyle(color: Colors.white54)),
          const SizedBox(height: 4),
          const Text('Make sure FastAPI is running at $kBaseUrl',
              style: TextStyle(color: Colors.white38, fontSize: 11)),
          const SizedBox(height: 16),
          ElevatedButton(onPressed: onRetry, child: const Text('Retry')),
        ],
      ),
    );
  }
}

class _ReportDetailSheet extends StatelessWidget {
  final IssueReport report;
  const _ReportDetailSheet({required this.report});

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.all(20),
      child: Column(
        mainAxisSize: MainAxisSize.min,
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Center(
            child: Container(
              width: 40,
              height: 4,
              decoration: BoxDecoration(
                  color: Colors.white24,
                  borderRadius: BorderRadius.circular(2)),
            ),
          ),
          const SizedBox(height: 16),
          Row(
            children: [
              Icon(report.categoryIcon,
                  color: report.categoryColor, size: 24),
              const SizedBox(width: 10),
              Text(report.category,
                  style: const TextStyle(
                      fontWeight: FontWeight.bold, fontSize: 18)),
            ],
          ),
          const SizedBox(height: 12),
          if (report.description.isNotEmpty)
            Text(report.description,
                style: const TextStyle(color: Colors.white70)),
          const SizedBox(height: 8),
          Text(
            'Reported: ${DateFormat('MMM d, yyyy · HH:mm').format(report.timestamp)}',
            style: const TextStyle(color: Colors.white38, fontSize: 12),
          ),
          Text(
            'Location: ${report.lat.toStringAsFixed(4)}, ${report.lon.toStringAsFixed(4)}',
            style: const TextStyle(color: Colors.white38, fontSize: 12),
          ),
          const SizedBox(height: 16),
        ],
      ),
    );
  }
}
