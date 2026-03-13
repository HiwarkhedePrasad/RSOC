class CityDataPoint {
  final DateTime timestamp;
  final double trafficFlow;
  final double pollutionLevel;
  final double transportationUsage;
  final double energyConsumption;
  final double populationActivity;
  final String zoneId;
  final String zoneName;

  CityDataPoint({
    required this.timestamp,
    required this.trafficFlow,
    required this.pollutionLevel,
    required this.transportationUsage,
    required this.energyConsumption,
    required this.populationActivity,
    required this.zoneId,
    required this.zoneName,
  });

  Map<String, dynamic> toJson() {
    return {
      'timestamp': timestamp.toIso8601String(),
      'trafficFlow': trafficFlow,
      'pollutionLevel': pollutionLevel,
      'transportationUsage': transportationUsage,
      'energyConsumption': energyConsumption,
      'populationActivity': populationActivity,
      'zoneId': zoneId,
      'zoneName': zoneName,
    };
  }

  factory CityDataPoint.fromJson(Map<String, dynamic> json) {
    return CityDataPoint(
      timestamp: DateTime.parse(json['timestamp']),
      trafficFlow: (json['trafficFlow'] as num).toDouble(),
      pollutionLevel: (json['pollutionLevel'] as num).toDouble(),
      transportationUsage: (json['transportationUsage'] as num).toDouble(),
      energyConsumption: (json['energyConsumption'] as num).toDouble(),
      populationActivity: (json['populationActivity'] as num).toDouble(),
      zoneId: json['zoneId'],
      zoneName: json['zoneName'],
    );
  }
}

class CityZone {
  final String id;
  final String name;
  final double latitude;
  final double longitude;
  final String type; // residential, commercial, industrial, educational
  final double area; // in km²

  CityZone({
    required this.id,
    required this.name,
    required this.latitude,
    required this.longitude,
    required this.type,
    required this.area,
  });

  factory CityZone.fromJson(Map<String, dynamic> json) {
    return CityZone(
      id: json['id'],
      name: json['name'],
      latitude: (json['latitude'] as num).toDouble(),
      longitude: (json['longitude'] as num).toDouble(),
      type: json['type'],
      area: (json['area'] as num).toDouble(),
    );
  }
}

class DataInsight {
  final String type;
  final String title;
  final String description;
  final double value;
  final String unit;
  final DateTime timestamp;
  final String zoneId;
  final Severity severity;

  DataInsight({
    required this.type,
    required this.title,
    required this.description,
    required this.value,
    required this.unit,
    required this.timestamp,
    required this.zoneId,
    required this.severity,
  });
}

enum Severity {
  low,
  medium,
  high,
  critical,
}

extension SeverityExtension on Severity {
  Color get color {
    switch (this) {
      case Severity.low:
        return Colors.green;
      case Severity.medium:
        return Colors.orange;
      case Severity.high:
        return Colors.red;
      case Severity.critical:
        return Colors.purple;
    }
  }

  String get displayName {
    switch (this) {
      case Severity.low:
        return 'Low';
      case Severity.medium:
        return 'Medium';
      case Severity.high:
        return 'High';
      case Severity.critical:
        return 'Critical';
    }
  }
}

class CorrelationData {
  final String metric1;
  final String metric2;
  final double correlation;
  final String description;

  CorrelationData({
    required this.metric1,
    required this.metric2,
    required this.correlation,
    required this.description,
  });
}

class PredictiveModel {
  final String name;
  final String description;
  final double accuracy;
  final Map<String, dynamic> predictions;
  final DateTime lastUpdated;

  PredictiveModel({
    required this.name,
    required this.description,
    required this.accuracy,
    required this.predictions,
    required this.lastUpdated,
  });
}
