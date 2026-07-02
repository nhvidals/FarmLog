import { useMemo } from "react";
import { View } from "react-native";
import { CalendarView } from "../calendar";
import { SectionHeader } from "../components";
import { useApp } from "../context";
import { buildCalendarEvents } from "../helpers";
import { useAnimals, useIncubation, useMedication } from "../queries";

export function CalendarScreen() {
  const { t, api, farmId, token } = useApp();
  const { data: animals = [] } = useAnimals(api, farmId, token);
  const { data: incubationList = [] } = useIncubation(api, farmId, token);
  const { data: medicationList = [] } = useMedication(api, farmId, token);

  const events = useMemo(
    () => buildCalendarEvents(animals, incubationList, medicationList),
    [animals, incubationList, medicationList]
  );

  return (
    <View>
      <SectionHeader title={t.tabCalendar} />
      <CalendarView events={events} t={t} />
    </View>
  );
}
