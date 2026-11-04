import { useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Pressable,
  ScrollView,
  StyleSheet,
  TextInput,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { BottomTabInset, MaxContentWidth, Spacing } from '@/constants/theme';
import { useAppData } from '@/context/app-data-context';
import { useThemePreference } from '@/context/theme-context';
import { useTheme } from '@/hooks/use-theme';
import { getSupabase } from '@/lib/supabase/client';
import type { Category, ThemePreference } from '@/types/database';

const COLOR_PRESETS = [
  '#22C55E', // Green
  '#3B82F6', // Blue
  '#A855F7', // Purple
  '#EAB308', // Yellow
  '#F97316', // Orange
  '#EF4444', // Red
  '#EC4899', // Pink
  '#06B6D4', // Cyan
  '#84CC16', // Lime
];

export default function SettingsScreen() {
  const theme = useTheme();
  const { preference, resolvedScheme, setPreference } = useThemePreference();
  const {
    userId,
    categories,
    createCategory,
    updateCategory,
    deleteCategory,
    isSyncing,
    refreshData,
  } = useAppData();

  // Category creation & editing state
  const [showCategoryForm, setShowCategoryForm] = useState(false);
  const [editingCategoryId, setEditingCategoryId] = useState<string | null>(null);
  const [categoryName, setCategoryName] = useState('');
  const [categoryColor, setCategoryColor] = useState(COLOR_PRESETS[0]);
  const [isSavingCategory, setIsSavingCategory] = useState(false);

  const handleSelectTheme = async (pref: ThemePreference) => {
    setPreference(pref);
    if (userId) {
      try {
        const supabase = getSupabase();
        await supabase
          .from('profiles')
          .update({ theme_preference: pref })
          .eq('id', userId);
      } catch (err: unknown) {
        console.warn('Could not save theme preference to Supabase:', err);
      }
    }
  };

  const handleStartEditCategory = (cat: Category) => {
    setEditingCategoryId(cat.id);
    setCategoryName(cat.name);
    setCategoryColor(cat.color_hex);
    setShowCategoryForm(true);
  };

  const handleCancelCategoryForm = () => {
    setShowCategoryForm(false);
    setEditingCategoryId(null);
    setCategoryName('');
    setCategoryColor(COLOR_PRESETS[0]);
  };

  const handleSaveCategory = async () => {
    if (!categoryName.trim()) {
      Alert.alert('Nombre requerido', 'Ingresa un nombre para la categoría.');
      return;
    }

    setIsSavingCategory(true);
    try {
      if (editingCategoryId) {
        await updateCategory(editingCategoryId, {
          name: categoryName.trim(),
          color_hex: categoryColor,
        });
        Alert.alert('Categoría actualizada');
      } else {
        await createCategory({
          name: categoryName.trim(),
          color_hex: categoryColor,
        });
        Alert.alert('Categoría creada');
      }
      handleCancelCategoryForm();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Error al guardar categoría';
      Alert.alert('Error', msg);
    } finally {
      setIsSavingCategory(false);
    }
  };

  const handleDeleteCategory = (cat: Category) => {
    Alert.alert(
      'Eliminar categoría',
      `¿Deseas eliminar la categoría "${cat.name}"? Los hábitos que la usen conservarán su información sin categoría.`,
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Eliminar',
          style: 'destructive',
          onPress: async () => {
            try {
              await deleteCategory(cat.id);
            } catch (err: unknown) {
              const msg = err instanceof Error ? err.message : 'Error al eliminar categoría';
              Alert.alert('Error', msg);
            }
          },
        },
      ],
    );
  };

  return (
    <ThemedView style={styles.container}>
      <SafeAreaView style={styles.safeArea}>
        <ThemedText type="subtitle">Ajustes</ThemedText>

        <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.content}>
          {/* Theme Preference */}
          <ThemedView type="backgroundElement" style={styles.sectionCard}>
            <ThemedText type="smallBold">Tema de la aplicación</ThemedText>
            <ThemedText type="small" themeColor="textSecondary">
              Tema activo: {resolvedScheme === 'dark' ? 'Oscuro' : 'Claro'}
            </ThemedText>

            <View style={styles.themeOptionsRow}>
              {[
                { key: 'system' as ThemePreference, label: '🌓 Sistema', desc: 'Auto' },
                { key: 'light' as ThemePreference, label: '☀️ Claro', desc: 'Light' },
                { key: 'dark' as ThemePreference, label: '🌙 Oscuro', desc: 'Dark' },
              ].map((item) => {
                const isSelected = preference === item.key;
                return (
                  <Pressable
                    key={item.key}
                    onPress={() => handleSelectTheme(item.key)}
                    style={[
                      styles.themeOptionButton,
                      { backgroundColor: theme.background },
                      isSelected && { borderColor: '#3B82F6', borderWidth: 2 },
                    ]}>
                    <ThemedText type="smallBold">{item.label}</ThemedText>
                    <ThemedText type="small" themeColor="textSecondary">
                      {item.desc}
                    </ThemedText>
                  </Pressable>
                );
              })}
            </View>
          </ThemedView>

          {/* Categories Management */}
          <ThemedView type="backgroundElement" style={styles.sectionCard}>
            <View style={styles.sectionHeader}>
              <View>
                <ThemedText type="smallBold">Categorías personalizadas</ThemedText>
                <ThemedText type="small" themeColor="textSecondary">
                  Crea y personaliza categorías y sus colores
                </ThemedText>
              </View>

              {!showCategoryForm && (
                <Pressable
                  onPress={() => {
                    handleCancelCategoryForm();
                    setShowCategoryForm(true);
                  }}
                  style={styles.addCategoryButton}>
                  <ThemedText type="smallBold" style={{ color: '#ffffff' }}>
                    + Nueva
                  </ThemedText>
                </Pressable>
              )}
            </View>

            {/* Category Form */}
            {showCategoryForm && (
              <ThemedView type="backgroundSelected" style={styles.categoryFormCard}>
                <ThemedText type="smallBold">
                  {editingCategoryId ? 'Editar Categoría' : 'Nueva Categoría'}
                </ThemedText>

                <TextInput
                  style={[
                    styles.input,
                    { color: theme.text, backgroundColor: theme.backgroundElement },
                  ]}
                  placeholder="Nombre de la categoría"
                  placeholderTextColor={theme.textSecondary}
                  value={categoryName}
                  onChangeText={setCategoryName}
                />

                <ThemedText type="small" themeColor="textSecondary">
                  Selecciona un color:
                </ThemedText>
                <View style={styles.colorPaletteRow}>
                  {COLOR_PRESETS.map((hex) => {
                    const isSelected = categoryColor === hex;
                    return (
                      <Pressable
                        key={hex}
                        onPress={() => setCategoryColor(hex)}
                        style={[
                          styles.colorCircle,
                          { backgroundColor: hex },
                          isSelected && styles.selectedColorCircle,
                        ]}
                      />
                    );
                  })}
                </View>

                <View style={styles.formActionButtons}>
                  <Pressable onPress={handleCancelCategoryForm} style={styles.cancelButton}>
                    <ThemedText type="small" themeColor="textSecondary">
                      Cancelar
                    </ThemedText>
                  </Pressable>

                  <Pressable
                    disabled={isSavingCategory}
                    onPress={handleSaveCategory}
                    style={styles.saveCategoryButton}>
                    {isSavingCategory ? (
                      <ActivityIndicator size="small" color="#ffffff" />
                    ) : (
                      <ThemedText type="smallBold" style={{ color: '#ffffff' }}>
                        Guardar
                      </ThemedText>
                    )}
                  </Pressable>
                </View>
              </ThemedView>
            )}

            {/* Categories List */}
            <View style={styles.categoryList}>
              {categories.map((cat) => (
                <View key={cat.id} style={styles.categoryRow}>
                  <View style={styles.categoryInfo}>
                    <View style={[styles.categoryColorDot, { backgroundColor: cat.color_hex }]} />
                    <ThemedText type="default">{cat.name}</ThemedText>
                  </View>

                  <View style={styles.categoryActions}>
                    <Pressable
                      onPress={() => handleStartEditCategory(cat)}
                      style={styles.smallAction}>
                      <ThemedText type="small" themeColor="textSecondary">
                        Editar
                      </ThemedText>
                    </Pressable>

                    <Pressable
                      onPress={() => handleDeleteCategory(cat)}
                      style={styles.smallAction}>
                      <ThemedText type="small" style={{ color: '#EF4444' }}>
                        Borrar
                      </ThemedText>
                    </Pressable>
                  </View>
                </View>
              ))}
            </View>
          </ThemedView>

          {/* Supabase Connection Info */}
          <ThemedView type="backgroundElement" style={styles.sectionCard}>
            <View style={styles.sectionHeader}>
              <View>
                <ThemedText type="smallBold">Base de datos (Supabase)</ThemedText>
                <ThemedText type="small" themeColor="textSecondary">
                  {userId ? `Sesión: ${userId.slice(0, 12)}...` : 'Conectando sesión...'}
                </ThemedText>
              </View>

              <Pressable
                disabled={isSyncing}
                onPress={refreshData}
                style={[styles.syncButton, isSyncing && { opacity: 0.5 }]}>
                {isSyncing ? (
                  <ActivityIndicator size="small" color="#ffffff" />
                ) : (
                  <ThemedText type="smallBold" style={{ color: '#ffffff' }}>
                    Sincronizar
                  </ThemedText>
                )}
              </Pressable>
            </View>
          </ThemedView>

          {/* App Info */}
          <ThemedView type="backgroundElement" style={styles.sectionCard}>
            <ThemedText type="smallBold">Habit Tracker</ThemedText>
            <ThemedText type="small" themeColor="textSecondary">
              100% gratuito y Open Source
            </ThemedText>
            <ThemedText type="small" themeColor="textSecondary">
              React Native · Expo SDK 58 · Supabase PostgreSQL
            </ThemedText>
          </ThemedView>
        </ScrollView>
      </SafeAreaView>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  safeArea: {
    flex: 1,
    paddingHorizontal: Spacing.four,
    paddingBottom: BottomTabInset,
    maxWidth: MaxContentWidth,
    alignSelf: 'center',
    width: '100%',
    gap: Spacing.two,
  },
  content: {
    gap: Spacing.three,
    paddingTop: Spacing.two,
    paddingBottom: Spacing.six,
  },
  sectionCard: {
    padding: Spacing.four,
    borderRadius: Spacing.three,
    gap: Spacing.two,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  themeOptionsRow: {
    flexDirection: 'row',
    gap: Spacing.two,
    marginTop: Spacing.one,
  },
  themeOptionButton: {
    flex: 1,
    padding: Spacing.three,
    borderRadius: Spacing.two,
    alignItems: 'center',
    gap: Spacing.half,
  },
  addCategoryButton: {
    backgroundColor: '#3B82F6',
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.one,
    borderRadius: Spacing.two,
  },
  categoryFormCard: {
    padding: Spacing.three,
    borderRadius: Spacing.two,
    gap: Spacing.two,
    marginTop: Spacing.one,
  },
  input: {
    height: 44,
    borderRadius: Spacing.two,
    paddingHorizontal: Spacing.three,
    fontSize: 15,
  },
  colorPaletteRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.two,
  },
  colorCircle: {
    width: 28,
    height: 28,
    borderRadius: 14,
  },
  selectedColorCircle: {
    borderWidth: 3,
    borderColor: '#ffffff',
  },
  formActionButtons: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: Spacing.two,
    marginTop: Spacing.one,
  },
  cancelButton: {
    paddingVertical: Spacing.two,
    paddingHorizontal: Spacing.three,
  },
  saveCategoryButton: {
    backgroundColor: '#3B82F6',
    paddingVertical: Spacing.two,
    paddingHorizontal: Spacing.four,
    borderRadius: Spacing.two,
  },
  categoryList: {
    gap: Spacing.two,
    marginTop: Spacing.one,
  },
  categoryRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: Spacing.one,
  },
  categoryInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
  },
  categoryColorDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
  },
  categoryActions: {
    flexDirection: 'row',
    gap: Spacing.three,
  },
  smallAction: {
    paddingVertical: Spacing.half,
  },
  syncButton: {
    backgroundColor: '#3B82F6',
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.two,
    borderRadius: Spacing.two,
  },
});
