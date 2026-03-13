import 'dart:convert';
import 'package:http/http.dart' as http;

class ApiService {
  static const String _baseUrlPublic = 'https://friends-holder-registrar-seventh.trycloudflare.com';
  // Fallback URLs for local development
  static const String _baseUrlAndroid = 'http://10.0.2.2:8000';
  static const String _baseUrlLocalhost = 'http://localhost:8000';

  static String get baseUrl => _baseUrlPublic;

  // Generic GET request
  static Future<dynamic> _get(String endpoint) async {
    try {
      final response = await http.get(Uri.parse('$baseUrl$endpoint'));
      if (response.statusCode == 200) {
        return jsonDecode(response.body);
      } else {
        throw Exception('Failed to load data: ${response.statusCode}');
      }
    } catch (e) {
      // Try localhost fallback
      try {
        final response = await http.get(Uri.parse('$_baseUrlLocalhost$endpoint'));
        if (response.statusCode == 200) {
          return jsonDecode(response.body);
        }
      } catch (_) {}
      throw Exception('Failed to connect to API: $e');
    }
  }

  // Generic POST request
  static Future<dynamic> _post(String endpoint, Map<String, dynamic> body) async {
    try {
      final response = await http.post(
        Uri.parse('$baseUrl$endpoint'),
        headers: {'Content-Type': 'application/json'},
        body: jsonEncode(body),
      );
      if (response.statusCode == 200) {
        return jsonDecode(response.body);
      } else {
        throw Exception('Failed to post data: ${response.statusCode}');
      }
    } catch (e) {
      throw Exception('Failed to connect to API: $e');
    }
  }

  // Fetch summary data
  static Future<Map<String, dynamic>> fetchSummary() async {
    final data = await _get('/api/summary');
    return data as Map<String, dynamic>;
  }

  // Fetch anomalies
  static Future<List<dynamic>> fetchAnomalies() async {
    final data = await _get('/api/anomalies');
    return data as List<dynamic>;
  }

  // Fetch zones
  static Future<List<dynamic>> fetchZones() async {
    final data = await _get('/api/zones');
    return data as List<dynamic>;
  }

  // Fetch zone timeseries
  static Future<Map<String, dynamic>> fetchZoneTimeseries(
    String zoneId, {
    String metric = 'aqi',
    int hours = 48,
  }) async {
    final data = await _get('/api/zones/$zoneId/timeseries?metric=$metric&hours=$hours');
    return data as Map<String, dynamic>;
  }

  // NLP Query
  static Future<Map<String, dynamic>> nlpQuery(String question) async {
    final data = await _post('/api/query', {'question': question});
    return data as Map<String, dynamic>;
  }
}
