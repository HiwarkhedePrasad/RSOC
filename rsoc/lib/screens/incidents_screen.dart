import 'package:flutter/material.dart';
import '../theme/app_theme.dart';

class IncidentsScreen extends StatefulWidget {
  const IncidentsScreen({super.key});

  @override
  State<IncidentsScreen> createState() => _IncidentsScreenState();
}

class _IncidentsScreenState extends State<IncidentsScreen>
    with SingleTickerProviderStateMixin {
  late TabController _tabController;

  @override
  void initState() {
    super.initState();
    _tabController = TabController(length: 4, vsync: this);
  }

  @override
  void dispose() {
    _tabController.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final isDark = Theme.of(context).brightness == Brightness.dark;

    return Scaffold(
      body: SafeArea(
        child: Column(
          children: [
            // Custom Header
            Container(
              padding: const EdgeInsets.all(20),
              decoration: BoxDecoration(
                gradient: AppTheme.primaryGradient,
                borderRadius: const BorderRadius.only(
                  bottomLeft: Radius.circular(24),
                  bottomRight: Radius.circular(24),
                ),
              ),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Row(
                    mainAxisAlignment: MainAxisAlignment.spaceBetween,
                    children: [
                      const Text(
                        'Security Incidents',
                        style: TextStyle(
                          fontSize: 24,
                          fontWeight: FontWeight.w700,
                          color: Colors.white,
                        ),
                      ),
                      Container(
                        padding: const EdgeInsets.all(8),
                        decoration: BoxDecoration(
                          color: Colors.white.withOpacity(0.2),
                          borderRadius: BorderRadius.circular(12),
                        ),
                        child: const Icon(
                          Icons.filter_list,
                          color: Colors.white,
                        ),
                      ),
                    ],
                  ),
                  const SizedBox(height: 16),
                  // Search Bar
                  Container(
                    decoration: BoxDecoration(
                      color: Colors.white.withOpacity(0.15),
                      borderRadius: BorderRadius.circular(12),
                    ),
                    child: TextField(
                      style: const TextStyle(color: Colors.white),
                      decoration: InputDecoration(
                        hintText: 'Search incidents...',
                        hintStyle: TextStyle(
                          color: Colors.white.withOpacity(0.7),
                        ),
                        prefixIcon: Icon(
                          Icons.search,
                          color: Colors.white.withOpacity(0.7),
                        ),
                        border: InputBorder.none,
                        contentPadding: const EdgeInsets.symmetric(
                          horizontal: 16,
                          vertical: 14,
                        ),
                      ),
                    ),
                  ),
                ],
              ),
            ),

            // Filter Chips
            Padding(
              padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 12),
              child: SingleChildScrollView(
                scrollDirection: Axis.horizontal,
                child: Row(
                  children: [
                    _buildFilterChip('All', true),
                    _buildFilterChip('Critical', false),
                    _buildFilterChip('High', false),
                    _buildFilterChip('Medium', false),
                    _buildFilterChip('Low', false),
                  ],
                ),
              ),
            ),

            // Tab Bar
            Container(
              margin: const EdgeInsets.symmetric(horizontal: 16),
              decoration: BoxDecoration(
                color: isDark ? AppTheme.darkCard : Colors.grey.shade100,
                borderRadius: BorderRadius.circular(12),
              ),
              child: TabBar(
                controller: _tabController,
                indicator: BoxDecoration(
                  gradient: AppTheme.primaryGradient,
                  borderRadius: BorderRadius.circular(10),
                ),
                labelColor: Colors.white,
                unselectedLabelColor:
                    isDark ? Colors.grey.shade400 : Colors.grey.shade600,
                indicatorSize: TabBarIndicatorSize.tab,
                dividerColor: Colors.transparent,
                tabs: const [
                  Tab(text: 'Open'),
                  Tab(text: 'In Progress'),
                  Tab(text: 'Resolved'),
                  Tab(text: 'Closed'),
                ],
              ),
            ),

            // Tab Content
            Expanded(
              child: TabBarView(
                controller: _tabController,
                children: [
                  _buildIncidentsList(),
                  _buildIncidentsList(inProgress: true),
                  _buildIncidentsList(resolved: true),
                  _buildIncidentsList(closed: true),
                ],
              ),
            ),
          ],
        ),
      ),
      floatingActionButton: FloatingActionButton.extended(
        onPressed: () {},
        backgroundColor: AppTheme.primaryColor,
        icon: const Icon(Icons.add),
        label: const Text('New Incident'),
      ),
    );
  }

  Widget _buildFilterChip(String label, bool isSelected) {
    return Padding(
      padding: const EdgeInsets.only(right: 8),
      child: Chip(
        label: Text(label),
        backgroundColor: isSelected ? AppTheme.primaryColor : Colors.transparent,
        side: BorderSide(
          color: isSelected ? Colors.transparent : Colors.grey.shade300,
        ),
        labelStyle: TextStyle(
          color: isSelected ? Colors.white : Colors.grey.shade600,
          fontWeight: FontWeight.w500,
        ),
      ),
    );
  }

  Widget _buildIncidentsList({
    bool inProgress = false,
    bool resolved = false,
    bool closed = false,
  }) {
    final incidents = [
      _Incident(
        id: 'INC-2024-001',
        title: 'Unauthorized Access Attempt',
        description: 'Multiple failed login attempts detected from IP 192.168.1.100',
        severity: 'Critical',
        time: '2 minutes ago',
        status: inProgress
            ? 'In Progress'
            : resolved
                ? 'Resolved'
                : closed
                    ? 'Closed'
                    : 'Open',
      ),
      _Incident(
        id: 'INC-2024-002',
        title: 'Firewall Rule Violation',
        description: 'Outbound connection blocked by firewall policy',
        severity: 'High',
        time: '15 minutes ago',
        status: inProgress
            ? 'In Progress'
            : resolved
                ? 'Resolved'
                : closed
                    ? 'Closed'
                    : 'Open',
      ),
      _Incident(
        id: 'INC-2024-003',
        title: 'Suspicious Network Traffic',
        description: 'Unusual data transfer pattern detected',
        severity: 'Medium',
        time: '1 hour ago',
        status: inProgress
            ? 'In Progress'
            : resolved
                ? 'Resolved'
                : closed
                    ? 'Closed'
                    : 'Open',
      ),
      _Incident(
        id: 'INC-2024-004',
        title: 'Malware Detection Alert',
        description: 'Potential malware signature detected in endpoint',
        severity: 'Critical',
        time: '2 hours ago',
        status: inProgress
            ? 'In Progress'
            : resolved
                ? 'Resolved'
                : closed
                    ? 'Closed'
                    : 'Open',
      ),
      _Incident(
        id: 'INC-2024-005',
        title: 'SSL Certificate Expiry',
        description: 'Certificate expiring in 7 days',
        severity: 'Low',
        time: '3 hours ago',
        status: inProgress
            ? 'In Progress'
            : resolved
                ? 'Resolved'
                : closed
                    ? 'Closed'
                    : 'Open',
      ),
    ];

    return ListView.builder(
      padding: const EdgeInsets.all(16),
      itemCount: incidents.length,
      itemBuilder: (context, index) {
        return _buildIncidentCard(incidents[index]);
      },
    );
  }

  Widget _buildIncidentCard(_Incident incident) {
    Color severityColor;
    IconData severityIcon;

    switch (incident.severity) {
      case 'Critical':
        severityColor = AppTheme.errorColor;
        severityIcon = Icons.error;
      case 'High':
        severityColor = AppTheme.warningColor;
        severityIcon = Icons.warning;
      case 'Medium':
        severityColor = AppTheme.primaryColor;
        severityIcon = Icons.info;
      default:
        severityColor = Colors.grey;
        severityIcon = Icons.low_priority;
    }

    return Container(
      margin: const EdgeInsets.only(bottom: 12),
      decoration: BoxDecoration(
        borderRadius: BorderRadius.circular(16),
        border: Border.all(
          color: severityColor.withOpacity(0.3),
          width: 1,
        ),
      ),
      child: Card(
        elevation: 0,
        margin: EdgeInsets.zero,
        child: InkWell(
          onTap: () {},
          borderRadius: BorderRadius.circular(16),
          child: Padding(
            padding: const EdgeInsets.all(16),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Row(
                  children: [
                    Container(
                      padding: const EdgeInsets.all(8),
                      decoration: BoxDecoration(
                        color: severityColor.withOpacity(0.1),
                        borderRadius: BorderRadius.circular(8),
                      ),
                      child: Icon(
                        severityIcon,
                        color: severityColor,
                        size: 20,
                      ),
                    ),
                    const SizedBox(width: 12),
                    Expanded(
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Text(
                            incident.id,
                            style: TextStyle(
                              fontSize: 12,
                              color: Colors.grey.shade500,
                              fontWeight: FontWeight.w500,
                            ),
                          ),
                          Text(
                            incident.title,
                            style: const TextStyle(
                              fontSize: 16,
                              fontWeight: FontWeight.w600,
                            ),
                          ),
                        ],
                      ),
                    ),
                    Container(
                      padding: const EdgeInsets.symmetric(
                        horizontal: 8,
                        vertical: 4,
                      ),
                      decoration: BoxDecoration(
                        color: severityColor.withOpacity(0.1),
                        borderRadius: BorderRadius.circular(6),
                      ),
                      child: Text(
                        incident.severity,
                        style: TextStyle(
                          fontSize: 11,
                          fontWeight: FontWeight.w600,
                          color: severityColor,
                        ),
                      ),
                    ),
                  ],
                ),
                const SizedBox(height: 12),
                Text(
                  incident.description,
                  style: TextStyle(
                    fontSize: 14,
                    color: Colors.grey.shade600,
                  ),
                ),
                const SizedBox(height: 12),
                Row(
                  children: [
                    Icon(
                      Icons.access_time,
                      size: 14,
                      color: Colors.grey.shade400,
                    ),
                    const SizedBox(width: 4),
                    Text(
                      incident.time,
                      style: TextStyle(
                        fontSize: 12,
                        color: Colors.grey.shade500,
                      ),
                    ),
                    const Spacer(),
                    Container(
                      padding: const EdgeInsets.symmetric(
                        horizontal: 10,
                        vertical: 4,
                      ),
                      decoration: BoxDecoration(
                        color: _getStatusColor(incident.status),
                        borderRadius: BorderRadius.circular(12),
                      ),
                      child: Text(
                        incident.status,
                        style: const TextStyle(
                          fontSize: 11,
                          fontWeight: FontWeight.w600,
                          color: Colors.white,
                        ),
                      ),
                    ),
                  ],
                ),
              ],
            ),
          ),
        ),
      ),
    );
  }

  Color _getStatusColor(String status) {
    switch (status) {
      case 'Open':
        return AppTheme.errorColor;
      case 'In Progress':
        return AppTheme.warningColor;
      case 'Resolved':
        return AppTheme.successColor;
      case 'Closed':
        return Colors.grey;
      default:
        return Colors.grey;
    }
  }
}

class _Incident {
  final String id;
  final String title;
  final String description;
  final String severity;
  final String time;
  final String status;

  _Incident({
    required this.id,
    required this.title,
    required this.description,
    required this.severity,
    required this.time,
    required this.status,
  });
}
