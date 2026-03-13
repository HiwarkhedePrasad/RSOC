import 'package:flutter/material.dart';
import '../theme/app_theme.dart';

class RecentAlertsList extends StatelessWidget {
  const RecentAlertsList({super.key});

  @override
  Widget build(BuildContext context) {
    final alerts = [
      _Alert(
        title: 'Suspicious Login Attempt',
        description: 'Multiple failed login from 192.168.1.100',
        time: '2 min ago',
        type: 'Critical',
        icon: Icons.login,
        color: AppTheme.errorColor,
      ),
      _Alert(
        title: 'Firewall Rule Triggered',
        description: 'Blocked outgoing connection to suspicious IP',
        time: '15 min ago',
        type: 'High',
        icon: Icons.shield,
        color: AppTheme.warningColor,
      ),
      _Alert(
        title: 'System Update Available',
        description: 'Security patch 2024.03.13 ready to install',
        time: '1 hour ago',
        type: 'Info',
        icon: Icons.update,
        color: AppTheme.primaryColor,
      ),
      _Alert(
        title: 'Backup Completed',
        description: 'Daily security logs backup successful',
        time: '3 hours ago',
        type: 'Success',
        icon: Icons.backup,
        color: AppTheme.successColor,
      ),
    ];

    return Column(
      children: alerts.map((alert) => _buildAlertItem(context, alert)).toList(),
    );
  }

  Widget _buildAlertItem(BuildContext context, _Alert alert) {
    final isDark = Theme.of(context).brightness == Brightness.dark;

    return Container(
      margin: const EdgeInsets.only(bottom: 12),
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: isDark ? AppTheme.darkCard : Colors.white,
        borderRadius: BorderRadius.circular(16),
        boxShadow: [
          BoxShadow(
            color: Colors.black.withOpacity(0.03),
            blurRadius: 10,
            offset: const Offset(0, 2),
          ),
        ],
      ),
      child: Row(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Container(
            padding: const EdgeInsets.all(12),
            decoration: BoxDecoration(
              color: alert.color.withOpacity(0.1),
              borderRadius: BorderRadius.circular(12),
            ),
            child: Icon(
              alert.icon,
              color: alert.color,
              size: 24,
            ),
          ),
          const SizedBox(width: 16),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Row(
                  mainAxisAlignment: MainAxisAlignment.spaceBetween,
                  children: [
                    Expanded(
                      child: Text(
                        alert.title,
                        style: TextStyle(
                          fontSize: 15,
                          fontWeight: FontWeight.w600,
                          color: isDark ? Colors.white : const Color(0xFF1E293B),
                        ),
                        maxLines: 1,
                        overflow: TextOverflow.ellipsis,
                      ),
                    ),
                    const SizedBox(width: 8),
                    Container(
                      padding: const EdgeInsets.symmetric(
                        horizontal: 8,
                        vertical: 3,
                      ),
                      decoration: BoxDecoration(
                        color: alert.color.withOpacity(0.1),
                        borderRadius: BorderRadius.circular(20),
                      ),
                      child: Text(
                        alert.type,
                        style: TextStyle(
                          fontSize: 10,
                          fontWeight: FontWeight.w600,
                          color: alert.color,
                        ),
                      ),
                    ),
                  ],
                ),
                const SizedBox(height: 6),
                Text(
                  alert.description,
                  style: TextStyle(
                    fontSize: 13,
                    color: isDark ? Colors.grey.shade400 : Colors.grey.shade600,
                  ),
                  maxLines: 2,
                  overflow: TextOverflow.ellipsis,
                ),
                const SizedBox(height: 8),
                Row(
                  children: [
                    Icon(
                      Icons.access_time,
                      size: 12,
                      color: Colors.grey.shade400,
                    ),
                    const SizedBox(width: 4),
                    Text(
                      alert.time,
                      style: TextStyle(
                        fontSize: 11,
                        color: Colors.grey.shade500,
                      ),
                    ),
                  ],
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }
}

class _Alert {
  final String title;
  final String description;
  final String time;
  final String type;
  final IconData icon;
  final Color color;

  _Alert({
    required this.title,
    required this.description,
    required this.time,
    required this.type,
    required this.icon,
    required this.color,
  });
}
