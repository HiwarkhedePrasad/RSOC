// This is a basic Flutter widget test.
//
// To perform an interaction with a widget in your test, use the WidgetTester
// utility in the flutter_test package. For example, you can send tap and scroll
// gestures. Through your widget tree, read text, and verify that the values
// of widget properties are correct.

import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';

import 'package:rsoc/main.dart';

void main() {
  testWidgets('RSOC app loads smoke test', (WidgetTester tester) async {
    // Build our app and trigger a frame.
    await tester.pumpWidget(const RSOCApp());

    // Verify that the app loads with Dashboard title
    expect(find.text('RSOC Dashboard'), findsOneWidget);
    expect(find.text('Dashboard'), findsWidgets);
  });
}
