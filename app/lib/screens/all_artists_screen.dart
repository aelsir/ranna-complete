import 'package:flutter/material.dart';

import 'package:ranna/components/common/people_list_page.dart';
import 'package:ranna/models/madih.dart';
import 'package:ranna/providers/supabase_providers.dart';

/// List of every artist (مادح) with infinite scroll. Thin wrapper around
/// [PeopleListPage] — see that file for the shared layout.
class AllArtistsScreen extends StatelessWidget {
  const AllArtistsScreen({super.key});

  @override
  Widget build(BuildContext context) {
    return PeopleListPage<Madih>(
      title: 'المادحين',
      searchFilter: SearchFilter.madih,
      pageProvider: paginatedArtistsProvider,
      getId: (m) => m.id,
      getName: (m) => m.name,
      getImageUrl: (m) => m.imageUrl,
      getTrackCount: (m) => m.trackCount,
      getRoute: (m) => '/profile/artist/${m.id}',
    );
  }
}
