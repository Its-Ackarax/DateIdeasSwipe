import { View, Button } from "react-native";
import { useState } from "react";
import { router } from "expo-router";

import Swiper from "react-native-deck-swiper";


import DateCard from "../components/DateCard";
import dates from "../data/dates";
import { useLikes } from "../../store/LikesContext";


export default function Home() {
;
  const { addLike } = useLikes();

  console.log(dates);

  return (
    <View style={{ flex: 1 }}>
      <Button title="View Likes" onPress={() => router.push("/likes")} />
      
      {dates?.length > 0 && (
        <Swiper
          cards={dates}
          renderCard={(card) => <DateCard item={card} />}
          onSwipedRight={(i) => {
            addLike(dates[i]);
          }}
          onSwipedLeft={(i) => console.log("Passed:", dates[i].title)}
          stackSize={3}
          backgroundColor="#f2f2f2"
        />
      )}
    </View>
  )
}
