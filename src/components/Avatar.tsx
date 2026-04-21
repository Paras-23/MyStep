// import React from 'react';
// import { View, Text, StyleSheet } from 'react-native';
// import { Colors } from '../../constants/theme';

// interface AvatarProps {
//   name: string;
//   size?: number;
//   color?: string;
// }

// export function Avatar({ name, size = 40, color = Colors.primary }: AvatarProps) {
//   const initials = name
//     .split(' ')
//     .map(w => w[0])
//     .slice(0, 2)
//     .join('')
//     .toUpperCase();

//   return (
//     <View
//       style={[
//         styles.container,
//         { width: size, height: size, borderRadius: size / 2, backgroundColor: color + '33', borderColor: color },
//       ]}
//     >
//       <Text style={[styles.text, { fontSize: size * 0.35, color }]}>{initials}</Text>
//     </View>
//   );
// }

// const styles = StyleSheet.create({
//   container: {
//     justifyContent: 'center',
//     alignItems: 'center',
//     borderWidth: 1.5,
//   },
//   text: {
//     fontWeight: '700',
//   },
// });


import React from 'react';
import { View, Text, Image, StyleSheet } from 'react-native';
import { Colors } from '../../constants/theme';

interface AvatarProps {
  name: string;
  size?: number;
  color?: string;
  avatarUrl?: string;
}

export function Avatar({ name, size = 40, color = Colors.primary, avatarUrl }: AvatarProps) {
  const initials = name
    .split(' ')
    .map(w => w[0])
    .slice(0, 2)
    .join('')
    .toUpperCase();

  if (avatarUrl) {
    return (
      <Image
        source={{ uri: avatarUrl }}
        style={{
          width: size,
          height: size,
          borderRadius: size / 2,
          borderWidth: 2,
          borderColor: color,
        }}
      />
    );
  }

  return (
    <View style={[styles.container, {
      width: size, height: size,
      borderRadius: size / 2,
      backgroundColor: color + '33',
      borderColor: color,
    }]}>
      <Text style={[styles.text, { fontSize: size * 0.35, color }]}>{initials}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { justifyContent: 'center', alignItems: 'center', borderWidth: 1.5 },
  text: { fontWeight: '700' },
});
