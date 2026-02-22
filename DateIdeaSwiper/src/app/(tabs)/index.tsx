import { View, Button } from "react-native";
import { useEffect } from "react";
import { router } from "expo-router";
import Swiper from "react-native-deck-swiper";

import DateCard from "../../components/DateCard";
import dates from "../data/dates";
import { useLikes } from "../../store/LikesContext";
import { supabase } from "../../lib/supabase";

export default function Home() {
  const { addLike } = useLikes();

  // 🔐 auth guard
  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      if (!data.session) router.replace("../auth/login");
    });
  }, []);

  return (
    <View style={{ flex: 1 }}>
      <Button title="View Likes" onPress={() => router.push("/likes")} />

      <Swiper
        cards={dates}
        renderCard={(card) => <DateCard item={card} />}
        onSwipedRight={(i) => addLike(dates[i])}
        stackSize={3}
        backgroundColor="#f2f2f2"
      />
    </View>
  );
}