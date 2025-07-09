import { Modal, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';

const Zlatnik = () => <Text style={styles.coin}>🪙</Text>;

const MembershipModal = ({ visible, onClose }) => {
  return (
    <Modal
      visible={visible}
      animationType="fade"
      transparent
      onRequestClose={onClose}
    >
      <View style={styles.overlay}>
        <View style={styles.modal}>
          <TouchableOpacity onPress={onClose} style={styles.closeBtn}>
            <Text style={{ fontSize: 24, color: '#fff' }}>×</Text>
          </TouchableOpacity>

          <Text style={styles.title}>
            Uporedni pregled funkcija po paketima
          </Text>

          <ScrollView horizontal contentContainerStyle={{ minWidth: 360 }}>
            <View style={styles.table}>
              {/* Header */}
              <View style={[styles.row, styles.header]}>
                <Text style={[styles.cell, styles.headerCell, { flex: 2 }]}>Funkcija</Text>
                <Text style={[styles.cell, styles.headerCell]}>Free</Text>
                <Text style={[styles.cell, styles.headerCell]}>Premium</Text>
                <Text style={[styles.cell, styles.headerCell]}>Pro</Text>
              </View>
              {/* Sadržaj */}
              {[
                ["Značenje karata", [<Zlatnik />, <Zlatnik />, <Zlatnik />]],
                ["Klasična otvaranja", [<Zlatnik />, <Zlatnik />, <Zlatnik />]],
                ["Keltski krst", [<Zlatnik />, <Zlatnik />, <Zlatnik />]],
                ["Astrološko otvaranje", [<Text style={styles.x}>—</Text>, <Zlatnik />, <Zlatnik />]],
                ["Drvo života", [<Text style={styles.x}>—</Text>, <Text style={styles.x}>—</Text>, <Zlatnik />]],
                ["AI potpitanja", [<Text style={styles.x}>—</Text>, <Text style={styles.x}>—</Text>, <Zlatnik />]],
                ["Reklame", [
                  <Text style={{ color: "#fff", fontSize: 13 }}>Prikazane</Text>,
                  <Text style={{ color: "#fff", fontSize: 13 }}>Bez reklama</Text>,
                  <Text style={{ color: "#fff", fontSize: 13 }}>Bez reklama</Text>
                ]],
              ].map((row, i) => (
                <View
                  key={row[0]}
                  style={[
                    styles.row,
                    i % 2 === 1 ? styles.altRow : null,
                  ]}
                >
                  <Text style={[styles.cell, { flex: 2, textAlign: 'left' }]}>{row[0]}</Text>
                  {row[1].map((cell, j) => (
                    <View key={j} style={styles.cell}>
                      {cell}
                    </View>
                  ))}
                </View>
              ))}
            </View>
          </ScrollView>

          <Text style={styles.footer}>
            ⚠️ Zlatnici se osvajaju gledanjem reklama. Otključavanje dodatnih otvaranja moguće je samo u Free paketu.
          </Text>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: "#000b",
    justifyContent: "center",
    alignItems: "center",
    padding: 16,
  },
  modal: {
    backgroundColor: "#111",
    borderRadius: 22,
    padding: 22,
    width: '100%',
    maxWidth: 420,
    shadowColor: "#000",
    shadowOpacity: 0.35,
    shadowRadius: 22,
    elevation: 14,
    alignItems: "center",
  },
  closeBtn: {
    position: "absolute",
    top: 14,
    right: 18,
    zIndex: 22,
    padding: 6,
  },
  title: {
    fontSize: 22,
    color: "#FFD700",
    fontWeight: "bold",
    textAlign: "center",
    marginBottom: 16,
    marginTop: 4,
  },
  table: {
    borderWidth: 1,
    borderColor: "#FFD700",
    borderRadius: 7,
    overflow: "hidden",
    marginBottom: 10,
    minWidth: 330,
  },
  row: {
    flexDirection: "row",
    alignItems: "center",
  },
  header: {
    backgroundColor: "#FFD700",
  },
  altRow: {
    backgroundColor: "#222",
  },
  cell: {
    flex: 1,
    borderWidth: 1,
    borderColor: "#FFD700",
    paddingVertical: 10,
    paddingHorizontal: 6,
    textAlign: "center",
    color: "#fff",
    fontSize: 15,
  },
  headerCell: {
    color: "#000",
    fontWeight: "bold",
    fontSize: 15.5,
    textAlign: "center",
    paddingVertical: 8,
  },
  x: {
    color: "#f33",
    fontSize: 19,
    textAlign: "center",
    fontWeight: "bold",
  },
  coin: {
    fontSize: 19,
    textAlign: "center",
  },
  footer: {
    marginTop: 16,
    fontSize: 12,
    color: "#BBB",
    textAlign: "center",
  },
});

export default MembershipModal;
