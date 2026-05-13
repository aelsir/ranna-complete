import 'package:flutter/material.dart';

import 'package:ranna/components/common/people_list_page.dart';
import 'package:ranna/models/rawi.dart';
import 'package:ranna/providers/supabase_providers.dart';

/// List of every narrator (راوي) with infinite scroll. Thin wrapper around
/// [PeopleListPage] — see that file for the shared layout.
class AllNarratorsScreen extends StatelessWidget {
  const AllNarratorsScreen({super.key});

  @override
  Widget build(BuildContext context) {
    return PeopleListPage<Rawi>(
      title: 'الرواة',
      searchFilter: SearchFilter.rawi,
      pageProvider: paginatedNarratorsProvider,
      getId: (n) => n.id,
      getName: (n) => n.name,
      getImageUrl: (n) => n.imageUrl,
      getTrackCount: (n) => n.trackCount,
      getRoute: (n) => '/profile/narrator/${n.id}',
    );
  }
}
