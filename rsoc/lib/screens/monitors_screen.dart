import 'package:flutter/material.dart';
import '../theme/app_theme.dart';

class MonitorsScreen extends StatefulWidget {
  const MonitorsScreen({super.key});

  @override
  State<MonitorsScreen> createState() => _MonitorsScreenState();
}

class _MonitorsScreenState extends State<MonitorsScreen> {
  @override
  Widget build(BuildContext context) {
    return Scaffold(
      body: SafeArea(
        child: Column(
          children: [
            // Header
            Container(
              padding: const EdgeInsets.all(20),
              decoration: const BoxDecoration(
                gradient: AppTheme.primaryGradient,
                borderRadius: BorderRadius.only(
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
                        'Security Monitors',
                        style: TextStyle(
                          fontSize: 24,
                          fontWeight: FontWeight.w700,
                          color: Colors.white,
                        ),
                      ),
                      Row(
                        children: [
                          Container(
                            padding: const EdgeInsets.all(8),
                            decoration: BoxDecoration(
                              color: Colors.white.withOpacity(0.2),
                              borderRadius: BorderRadius.circular(12),
                            ),
                            child: const Icon(
                              Icons.add,
                              color: Colors.white,
                            ),
                          ),
                          const SizedBox(width: 8),
                          Container(
                            padding: const EdgeInsets.all(8),
                            decoration: BoxDecoration(
                              color: Colors.white.withOpacity(0.2),
                              borderRadius: BorderRadius.circular(12),
                            ),
                            child: const Icon(
                              Icons.grid_view,
                              color: Colors.white,
                            ),
                          ),
                        ],
                      ),
                    ],
                  ),
                  const SizedBox(height: 16),
                  Row(
                    children: [
                      _buildSummaryChip(
                        'All Active',
                        '24',
                        AppTheme.successColor,
                      ),
                      const SizedBox(width: 12),
                      _buildSummaryChip(
                        'Warnings',
                        '3',
                        AppTheme.warningColor,
                      ),
                      const SizedBox(width: 12),
                      _buildSummaryChip(
                        'Errors',
                        '1',
                        AppTheme.errorColor,
                      ),
                    ],
                  ),
                ],
              ),
            ),

            // Monitors Grid
            Expanded(
              child: Padding(
                padding: const EdgeInsets.all(16),
                child: GridView.builder(
                  gridDelegate: const SliverGridDelegateWithFixedCrossAxisCount(
                    crossAxisCount: 2,
                    childAspectRatio: 0.85,
                    crossAxisSpacing: 12,
                    mainAxisSpacing: 12,
                  ),
                  itemCount: 8,
                  itemBuilder: (context, index) {
                    final monitors = [
                      _Monitor(
                        name: 'Network Firewall',
                        type: 'Security',
                        status: 'Active',
                        uptime: '99.9%',
                        icon: Icons.security,
                        color: AppTheme.primaryColor,
                      ),
                      _Monitor(
                        name: 'Endpoint Protection',
                        type: 'Antivirus',
                        status: 'Active',
                        uptime: '99.7%',
                        icon: Icons.shield,
                        color: AppTheme.secondaryColor,
                      ),
                      _Monitor(
                        name: 'Intrusion Detection',
                        type: 'IDS/IPS',
                        status: 'Warning',
                        uptime: '98.5%',
                        icon: Icons.remove_red_eye,
                        color: AppTheme.warningColor,
                      ),
                      _Monitor(
                        name: 'SIEM Collector',
                        type: 'Logging',
                        status: 'Active',
                        uptime: '99.9%',
                        icon: Icons.assessment,
                        color: AppTheme.accentColor,
                      ),
                      _Monitor(
                        name: 'Email Gateway',
                        type: 'Email Security',
                        status: 'Active',
                        uptime: '99.8%',
                        icon: Icons.email,
                        color: AppTheme.primaryColor,
                      ),
                      _Monitor(
                        name: 'Web Proxy',
                        type: 'Web Filter',
                        status: 'Error',
                        uptime: '95.2%',
                        icon: Icons.language,
                        color: AppTheme.errorColor,
                      ),
                      _Monitor(
                        name: 'VPN Gateway',
                        type: 'Remote Access',
                        status: 'Active',
                        uptime: '99.6%',
                        icon: Icons.vpn_key,
                        color: AppTheme.secondaryColor,
                      ),
                      _Monitor(
                        name: 'DLP Service',
                        type: 'Data Protection',
                        status: 'Active',
                        uptime: '99.4%',
                        icon: Icons.lock,
                        color: AppTheme.primaryColor,
                      ),
                    ];
                    return _buildMonitorCard(monitors[index]);
                  },
                ),
              ),
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildSummaryChip(String label, String count, Color color) {
    return Expanded(
      child: Container(
        padding: const EdgeInsets.symmetric(vertical: 12, horizontal: 16),
        decoration: BoxDecoration(
          color: Colors.white.withOpacity(0.15),
          borderRadius: BorderRadius.circular(12),
          border: Border.all(
            color: Colors.white.withOpacity(0.2),
          ),
        ),
        child: Column(
          children: [
            Text(
              count,
              style: const TextStyle(
                fontSize: 24,
                fontWeight: FontWeight.w700,
                color: Colors.white,
              ),
            ),
            Text(
              label,
              style: TextStyle(
                fontSize: 12,
                fontWeight: FontWeight.w500,
                color: Colors.white.withOpacity(0.8),
              ),
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildMonitorCard(_Monitor monitor) {
    Color statusColor;
    switch (monitor.status) {
      case 'Active':
        statusColor = AppTheme.successColor;
      case 'Warning':
        statusColor = AppTheme.warningColor;
      case 'Error':
        statusColor = AppTheme.errorColor;
      default:
        statusColor = Colors.grey;
    }

    return Container(
      decoration: BoxDecoration(
        borderRadius: BorderRadius.circular(16),
        gradient: LinearGradient(
          colors: [
            monitor.color.withOpacity(0.1),
            monitor.color.withOpacity(0.05),
          ],
          begin: Alignment.topLeft,
          end: Alignment.bottomRight,
        ),
        border: Border.all(
          color: monitor.color.withOpacity(0.2),
        ),
      ),
      child: Card(
        elevation: 0,
        color: Colors.transparent,
        child: Padding(
          padding: const EdgeInsets.all(16),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Row(
                mainAxisAlignment: MainAxisAlignment.spaceBetween,
                children: [
                  Container(
                    padding: const EdgeInsets.all(10),
                    decoration: BoxDecoration(
                      color: monitor.color.withOpacity(0.2),
                      borderRadius: BorderRadius.circular(12),
                    ),
                    child: Icon(
                      monitor.icon,
                      color: monitor.color,
                      size: 24,
                    ),
                  ),
                  Container(
                    width: 10,
                    height: 10,
                    decoration: BoxDecoration(
                      color: statusColor,
                      shape: BoxShape.circle,
                      boxShadow: [
                        BoxShadow(
                          color: statusColor.withOpacity(0.4),
                          blurRadius: 8,
                          spreadRadius: 2,
                        ),
                      ],
                    ),
                  ),
                ],
              ),
              const SizedBox(height: 16),
              Text(
                monitor.name,
                style: const TextStyle(
                  fontSize: 15,
                  fontWeight: FontWeight.w600,
                ),
                maxLines: 1,
                overflow: TextOverflow.ellipsis,
              ),
              const SizedBox(height: 4),
              Text(
                monitor.type,
                style: TextStyle(
                  fontSize: 12,
                  color: Colors.grey.shade500,
                ),
              ),
              const Spacer(),
              const Divider(),
              const SizedBox(height: 8),
              Row(
                mainAxisAlignment: MainAxisAlignment.spaceBetween,
                children: [
                  Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(
                        'Uptime',
                        style: TextStyle(
                          fontSize: 11,
                          color: Colors.grey.shade500,
                        ),
                      ),
                      Text(
                        monitor.uptime,
                        style: const TextStyle(
                          fontSize: 14,
                          fontWeight: FontWeight.w600,
                        ),
                      ),
                    ],
                  ),
                  Container(
                    padding: const EdgeInsets.symmetric(
                      horizontal: 8,
                      vertical: 4,
                    ),
                    decoration: BoxDecoration(
                      color: statusColor.withOpacity(0.1),
                      borderRadius: BorderRadius.circular(8),
                    ),
                    child: Text(
                      monitor.status,
                      style: TextStyle(
                        fontSize: 11,
                        fontWeight: FontWeight.w600,
                        color: statusColor,
                      ),
                    ),
                  ),
                ],
              ),
            ],
          ),
        ),
      ),
    );
  }
}

class _Monitor {
  final String name;
  final String type;
  final String status;
  final String uptime;
  final IconData icon;
  final Color color;

  _Monitor({
    required this.name,
    required this.type,
    required this.status,
    required this.uptime,
    required this.icon,
    required this.color,
  });
}
