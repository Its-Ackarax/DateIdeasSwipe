import { View, Text, SectionList, ActivityIndicator } from "react-native";
import { useCallback, useMemo, useState } from "react";
import { useFocusEffect } from "expo-router";
import { supabase } from "../../lib/supabase";
import { getDateIdeas } from "../../services/getDateIdeas";
import type { DateIdea } from "../../types/date";

export default function Matches() {
  const [matches, setMatches] = useState<string[]>([]);
  const [hasCouple, setHasCouple] = useState<boolean | null>(null);
  const [loading, setLoading] = useState(true);
  const [dates, setDates] = useState<DateIdea[]>([]);

  const loadMatches = useCallback(async () => {
    setLoading(true);
    try {
      const dateIdeas = await getDateIdeas();
      setDates(dateIdeas);

      const { data: userData, error: userError } = await supabase.auth.getUser();
      if (userError) throw userError;

      const user = userData.user;
      if (!user) {
        setHasCouple(false);
        setMatches([]);
        return;
      }

      const { data: couple, error: coupleError } = await supabase
        .from("couples")
        .select("*")
        .or(`user1.eq.${user.id},user2.eq.${user.id}`)
        .single();

      if (coupleError) throw coupleError;

      if (!couple) {
        setHasCouple(false);
        setMatches([]);
        return;
      }
      const partnerId =
        couple.user1 === user.id ? couple.user2 : couple.user1;

      if (!partnerId) {
        setHasCouple(false);
        setMatches([]);
        return;
      }

      setHasCouple(true);

      const { data: matchData, error: matchError } = await supabase
        .from("matches")
        .select("date_id")
        .eq("couple_id", couple.id);

      if (matchError) throw matchError;

      if (matchData && matchData.length > 0) {
        setMatches(matchData.map((x) => String(x.date_id)));
        return;
      }

      const { data: swipeData, error: swipeError } = await supabase
        .from("swipes")
        .select("date_id, user_id")
        .in("user_id", [user.id, partnerId])
        .eq("liked", true);

      if (swipeError) throw swipeError;

      if (swipeData) {
        const likedByDate = new Map<string, Set<string>>();

        swipeData.forEach((row) => {
          const dateId = String(row.date_id);
          const userId = String(row.user_id);

          if (!likedByDate.has(dateId)) {
            likedByDate.set(dateId, new Set());
          }

          likedByDate.get(dateId)?.add(userId);
        });

        const matchedIds = Array.from(likedByDate.entries())
          .filter(([, users]) => users.size >= 2)
          .map(([dateId]) => dateId);

        setMatches(matchedIds);
      } else {
        setMatches([]);
      }
    } catch (error) {
      console.log(error);
      setMatches([]);
      setHasCouple(false);
    } finally {
      setLoading(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      loadMatches();
    }, [loadMatches])
  );

  const matchedIdeas = useMemo(() => {
    const matchSet = new Set(matches);
    return dates.filter((idea) => matchSet.has(idea.id));
  }, [dates, matches]);

  const sections = useMemo(() => {
    const grouped = new Map<string, DateIdea[]>();

    matchedIdeas.forEach((idea) => {
      const category = idea.category || "Other";
      if (!grouped.has(category)) {
        grouped.set(category, []);
      }
      grouped.get(category)?.push(idea);
    });

    return Array.from(grouped.entries())
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([title, data]) => ({
        title,
        data: data.sort((a, b) => a.title.localeCompare(b.title)),
      }));
  }, [matchedIdeas]);

  if (hasCouple === false) {
    return (
      <View style={{ flex: 1, padding: 20, justifyContent: "center" }}>
        <Text style={{ fontSize: 18, textAlign: "center", color: "#444" }}>
          Link accounts with someone to see your matching dates.
        </Text>
      </View>
    );
  }

  if (loading) {
    return (
      <View style={{ flex: 1, justifyContent: "center" }}>
        <ActivityIndicator size="large" />
      </View>
    );
  }

  return (
    <View style={{ flex: 1, padding: 20 }}>
      <SectionList
        sections={sections}
        keyExtractor={(item) => item.id}
        renderSectionHeader={({ section }) => (
          <Text style={{ fontSize: 18, fontWeight: "600", marginTop: 10 }}>
            {section.title}
          </Text>
        )}
        renderItem={({ item }) => (
          <Text style={{ fontSize: 18, marginVertical: 6 }}>
            ❤️ {item.title}
          </Text>
        )}
        ListEmptyComponent={
          <Text style={{ textAlign: "center", marginTop: 50 }}>
            No matches yet — like some dates to get started!
          </Text>
        }
      />
    </View>
  );
}