import { useState } from "react";
import { Pressable, ScrollView, Text, View } from "react-native";
import { EmptyState, FieldLabel, SectionHeader, TreeNode } from "../components";
import { useApp } from "../context";
import { categoryOf } from "../helpers";
import { useAnimals, useAnimalTypes, useGenealogyTree } from "../queries";
import { styles } from "../styles";

export function GenealogyScreen() {
  const { t, api, farmId, token } = useApp();
  const { data: animals = [] } = useAnimals(api, farmId, token);
  const { data: animalTypes = [] } = useAnimalTypes(api, farmId, token);

  const [selectedRing, setSelectedRing] = useState("");
  const treeQuery = useGenealogyTree(api, farmId, selectedRing);

  const catOf = (designation?: string) => categoryOf(animalTypes, designation);

  return (
    <View>
      <SectionHeader title={t.familyTree} />

      <View style={styles.formCard}>
        <FieldLabel text={t.selectAnimal} />
        {animals.length === 0 ? (
          <Text style={styles.treeHint}>{t.noAnimalsToShow}</Text>
        ) : (
          <ScrollView horizontal contentContainerStyle={styles.chipRow} showsHorizontalScrollIndicator={false}>
            {animals.map((animal) => (
              <Pressable
                key={animal._id}
                style={[styles.chip, selectedRing === animal.ringNumber && styles.chipActive]}
                onPress={() => setSelectedRing(animal.ringNumber)}
              >
                <Text style={[styles.chipText, selectedRing === animal.ringNumber && styles.chipTextActive]}>
                  {animal.ringNumber} · {animal.name}
                </Text>
              </Pressable>
            ))}
          </ScrollView>
        )}
      </View>

      {treeQuery.data ? (
        <View style={styles.treeContainer}>
          <TreeNode node={treeQuery.data} t={t} categoryOf={catOf} />
        </View>
      ) : treeQuery.isError ? (
        <EmptyState icon="⚠️" text={t.errLoadTree} />
      ) : (
        <EmptyState icon="🌳" text={t.noTree} />
      )}
    </View>
  );
}
