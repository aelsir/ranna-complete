import 'package:flutter/widgets.dart';

/// Maximum content width on tablets — keeps the phone layout readable
/// instead of stretching across the full iPad screen.
const double kPhoneMaxWidth = 500.0;

/// Screens with shortestSide >= this are considered tablets.
const double kTabletBreakpoint = 600.0;

/// Returns true if the current device is a tablet (iPad).
bool isTablet(BuildContext context) =>
    MediaQuery.of(context).size.shortestSide >= kTabletBreakpoint;

/// Max width for content on the current device.
/// Phone: unconstrained. Tablet: constrained to phone-like width.
double contentMaxWidth(BuildContext context) =>
    isTablet(context) ? kPhoneMaxWidth : double.infinity;

/// Scale factor for fonts on tablet (15% larger for readability).
double fontScale(BuildContext context) => isTablet(context) ? 1.15 : 1.0;

/// Scale a dimension for tablet. Returns the original value on phone.
double scaleForTablet(BuildContext context, double phone, [double? tablet]) =>
    isTablet(context) ? (tablet ?? phone * 1.2) : phone;
