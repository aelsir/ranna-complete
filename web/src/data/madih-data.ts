import artist1 from "@/assets/artist-1.jpg";
import artist2 from "@/assets/artist-2.jpg";
import artist3 from "@/assets/artist-3.jpg";
import artist4 from "@/assets/artist-4.jpg";
import narrator1 from "@/assets/narrator-1.jpg";
import narrator2 from "@/assets/narrator-2.jpg";
import narrator3 from "@/assets/narrator-3.jpg";
import narrator4 from "@/assets/narrator-4.jpg";
import playlist1 from "@/assets/playlist-1.jpg";
import playlist2 from "@/assets/playlist-2.jpg";
import playlist3 from "@/assets/playlist-3.jpg";
import playlist4 from "@/assets/playlist-4.jpg";
import playlist5 from "@/assets/playlist-5.jpg";
import playlist6 from "@/assets/playlist-6.jpg";

export interface Track {
  id: string;
  title: string;
  artistId: string;
  artistName: string;
  narratorId: string;
  narratorName: string;
  duration: string;
}

export interface Artist {
  id: string;
  name: string;
  role: string;
  image: string;
}

export interface Narrator {
  id: string;
  name: string;
  role: string;
  image: string;
}

export interface Playlist {
  id: string;
  title: string;
  desc: string;
  image: string;
  trackIds: string[];
}

export interface Tariqa {
  id: string;
  name: string;
  image: string;
  description: string;
}

export interface Fan {
  id: string;
  name: string;
  image: string;
  description: string;
}

export const artists: Artist[] = [
  { id: "a1", name: "الشيخ أحمد البرعي", role: "مادح", image: artist1 },
  { id: "a2", name: "الشيخ محمد الأمين", role: "مادح", image: artist2 },
  { id: "a3", name: "فرقة الذاكرين", role: "فرقة مدائح", image: artist3 },
  { id: "a4", name: "أبو آمنة حامد", role: "مادح", image: artist4 },
];

export const narrators: Narrator[] = [
  { id: "n1", name: "الشيخ عبد الرحيم البرعي", role: "راوي", image: narrator1 },
  { id: "n2", name: "الشيخ حسن الفاتح", role: "راوي", image: narrator2 },
  { id: "n3", name: "محمد المصطفى", role: "راوي", image: narrator3 },
  { id: "n4", name: "الشيخ إبراهيم الكباشي", role: "راوي", image: narrator4 },
];

export const tariqas: Tariqa[] = [
  { id: "tq1", name: "الطريقة السمانية", image: playlist1, description: "من أكبر الطرق الصوفية في السودان" },
  { id: "tq2", name: "الطريقة القادرية", image: playlist2, description: "طريقة عريقة تنسب للشيخ عبد القادر الجيلاني" },
  { id: "tq3", name: "الطريقة التيجانية", image: playlist3, description: "طريقة صوفية واسعة الانتشار" },
  { id: "tq4", name: "الطريقة البرهانية", image: playlist4, description: "طريقة صوفية سودانية المنشأ" },
];

export const funoon: Fan[] = [
  { id: "fn1", name: "دقلاشي", image: playlist5, description: "فن المديح السوداني التقليدي" },
  { id: "fn2", name: "نقارة", image: playlist6, description: "إيقاعات المديح بالنقارة" },
  { id: "fn3", name: "تمتام", image: playlist1, description: "فن المديح بإيقاع التمتام" },
  { id: "fn4", name: "دلوكة", image: playlist2, description: "فن المديح بالدلوكة" },
];

export const tracks: Track[] = [
  { id: "t1", title: "يا رسول الله يا نبينا", artistId: "a1", artistName: "الشيخ أحمد البرعي", narratorId: "n1", narratorName: "الشيخ عبد الرحيم البرعي", duration: "٧:٣٢" },
  { id: "t2", title: "صلوا على خير الأنام", artistId: "a2", artistName: "الشيخ محمد الأمين", narratorId: "n2", narratorName: "الشيخ حسن الفاتح", duration: "٥:٤٨" },
  { id: "t3", title: "مولاي صلي وسلم", artistId: "a3", artistName: "فرقة الذاكرين", narratorId: "n3", narratorName: "محمد المصطفى", duration: "٦:١٥" },
  { id: "t4", title: "طلع البدر علينا", artistId: "a4", artistName: "أبو آمنة حامد", narratorId: "n4", narratorName: "الشيخ إبراهيم الكباشي", duration: "٤:٢٠" },
  { id: "t5", title: "قمر سيدنا النبي", artistId: "a1", artistName: "الشيخ أحمد البرعي", narratorId: "n2", narratorName: "الشيخ حسن الفاتح", duration: "٨:٠٣" },
  { id: "t6", title: "يا إلهي يا رحمن", artistId: "a3", artistName: "فرقة الذاكرين", narratorId: "n1", narratorName: "الشيخ عبد الرحيم البرعي", duration: "٥:٥٥" },
  { id: "t7", title: "يا حبيبي يا محمد", artistId: "a2", artistName: "الشيخ محمد الأمين", narratorId: "n4", narratorName: "الشيخ إبراهيم الكباشي", duration: "٦:٤٠" },
  { id: "t8", title: "نور النبي أضاء", artistId: "a4", artistName: "أبو آمنة حامد", narratorId: "n3", narratorName: "محمد المصطفى", duration: "٧:١٠" },
];

export const playlists: Playlist[] = [
  { id: "pl1", title: "مدائح الطريقة السمانية", desc: "٢٤ مديح", image: playlist1, trackIds: ["t1", "t3", "t5", "t6"] },
  { id: "pl2", title: "أذكار الصباح والمساء", desc: "١٨ مديح", image: playlist2, trackIds: ["t2", "t4", "t7", "t8"] },
  { id: "pl3", title: "مدائح المولد النبوي", desc: "٣٢ مديح", image: playlist3, trackIds: ["t1", "t2", "t3", "t4"] },
  { id: "pl4", title: "حلقات الذكر", desc: "١٥ مديح", image: playlist4, trackIds: ["t5", "t6", "t7", "t8"] },
  { id: "pl5", title: "أوراد وأحزاب", desc: "٢٠ مديح", image: playlist5, trackIds: ["t1", "t4", "t6", "t8"] },
  { id: "pl6", title: "قصائد نبوية", desc: "٢٨ مديح", image: playlist6, trackIds: ["t2", "t3", "t5", "t7"] },
];

export function getTracksByArtist(artistId: string) {
  return tracks.filter((t) => t.artistId === artistId);
}

export function getTracksByNarrator(narratorId: string) {
  return tracks.filter((t) => t.narratorId === narratorId);
}

export function getArtistById(id: string) {
  return artists.find((a) => a.id === id);
}

export function getNarratorById(id: string) {
  return narrators.find((n) => n.id === id);
}

export function getPlaylistById(id: string) {
  return playlists.find((p) => p.id === id);
}

export function getTracksByPlaylist(playlistId: string) {
  const playlist = getPlaylistById(playlistId);
  if (!playlist) return [];
  return playlist.trackIds.map((tid) => tracks.find((t) => t.id === tid)).filter(Boolean) as Track[];
}
