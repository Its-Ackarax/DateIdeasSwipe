import { Tabs } from "expo-router";
import { Ionicons } from "@expo/vector-icons";

/** MVP: hide Likes tab; screen file stays for a future release. Set `true` to show again. */
const LIKES_TAB_ENABLED = false;

export default function TabLayout() {
    return (
      <Tabs screenOptions={{ 
        headerShown: false,
        tabBarActiveTintColor:"#ff4d6d",
       }}>
        
        <Tabs.Screen
          name="index"
          options={{
            title: "Swipe",
            tabBarIcon: ({ color, size }) => (
              <Ionicons name="flame" size={size} color={color} />
            ),
          }}
        />
  
        <Tabs.Screen
          name="likes"
          options={{
            title: "Likes",
            ...(LIKES_TAB_ENABLED ? {} : { href: null }),
            tabBarIcon: ({ color, size }) => (
              <Ionicons name="heart" size={size} color={color} />
            ),
          }}
        />
  
        <Tabs.Screen
          name="matches"
          options={{
            title: "Matches",
            tabBarIcon: ({ color, size }) => (
              <Ionicons name="sparkles" size={size} color={color} />
            ),
          }}
        />
  
        <Tabs.Screen
          name="profile/index"
          options={{
            title: "Profile",
            tabBarIcon: ({ color, size }) => (
              <Ionicons name="person" size={size} color={color} />
            ),
          }}
        />
  
      </Tabs>
    );
  }