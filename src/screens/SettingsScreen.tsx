import React, { useRef, useState } from 'react';
import {
  Moon,
  Sun,
  Palette,
  Image as ImageIcon,
  RotateCcw,
  Undo2,
  Trash2,
  Upload,
  Check,
  User,
  Bell,
  Download,
  UploadCloud,
  ChevronRight,
  Shield,
  Smartphone,
  HardDrive,
  Key,
  Sparkles,
  Volume2,
  Copy,
  BookmarkPlus,
  AlertTriangle,
  Eye,
  ShieldCheck,
  CheckSquare,
  Square,
  Send,
} from 'lucide-react';
import { useApp } from '../context/AppContext';
import { AxonLogo } from '../components/AxonLogo';
import { AIAccountsSettings } from '../components/AIAccountsSettings';
import { SwipeableTabContainer } from '../components/SwipeableTabContainer';
import { IconPreset } from '../types';
import { formatBytes } from '../lib/storageManifest';
import {
  getContrastRatio,
  getContrastQuality,
  getRecommendedColors,
  getAutoContrastColor,
  resolveMessageButtonColor,
} from '../lib/colorContrast';

export const SettingsScreen: React.FC = () => {
  const {
    theme,
    setThemeMode,
    setAccentColor,
    setFunctionColor,
    resetThemeToDefault,
    icons,
    setAppIconPreset,
    setAppIconCustom,
    setAvatarPreset,
    setAvatarCustom,
    removeAvatar,
    restoreAvatar,
    setSyncAppIconAndAvatar,
    navigateTo,
    requestConfirmation,
    exportStateJson,
    importStateJson,
    resetAllData,
    storageBreakdown,
    storageBudget,
    showToast,
    pushNavState,
    activePanelPayload,
  } = useApp();

  const activeTab: 'ai' | 'appearance' | 'system' =
    (activePanelPayload?.settingsTab as 'ai' | 'appearance' | 'system') || 'ai';

  const setActiveTab = (tab: 'ai' | 'appearance' | 'system') => {
    pushNavState({ panelPayload: { ...(activePanelPayload || {}), settingsTab: tab } });
  };

  const appIconFileInputRef = useRef<HTMLInputElement>(null);
  const avatarFileInputRef = useRef<HTMLInputElement>(null);
  const restoreFileInputRef = useRef<HTMLInputElement>(null);

  // Preset choices for icons & avatars
  const presets: Array<{ id: IconPreset; name: string; desc: string }> = [
    { id: 'axon-orb', name: 'Luminous Orb', desc: 'Signature glowing core' },
    { id: 'axon-minimal', name: 'Minimal Monogram', desc: 'Sharp typography' },
    { id: 'axon-neural', name: 'Neural Synapse', desc: 'Constellation network' },
    { id: 'axon-cyber', name: 'Cyber Prism', desc: 'Futuristic geometry' },
  ];

  const handleCustomAppIconUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      setAppIconCustom(reader.result as string);
    };
    reader.readAsDataURL(file);
    e.target.value = '';
  };

  const handleCustomAvatarUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      setAvatarCustom(reader.result as string);
    };
    reader.readAsDataURL(file);
    e.target.value = '';
  };

  // Delete custom app icon with mandatory confirmation prompt
  const handleDeleteCustomAppIcon = () => {
    requestConfirmation({
      title: 'Remove Custom App Icon',
      message: 'Are you sure you want to delete this custom app icon and revert to the default?',
      confirmLabel: 'Revert Icon',
      danger: true,
      onConfirm: () => {
        setAppIconPreset('axon-orb');
        showToast('App icon reverted to default');
      },
    });
  };

  // Delete custom avatar with mandatory confirmation prompt
  const handleDeleteCustomAvatar = () => {
    requestConfirmation({
      title: 'Remove Chat Avatar',
      message: 'Are you sure you want to delete this custom avatar and revert to the default?',
      confirmLabel: 'Revert Avatar',
      danger: true,
      onConfirm: () => {
        removeAvatar();
      },
    });
  };

  // Export JSON file download
  const handleExportData = () => {
    const jsonStr = exportStateJson();
    const blob = new Blob([jsonStr], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `axon-workspace-backup-${new Date().toISOString().split('T')[0]}.json`;
    a.click();
    URL.revokeObjectURL(url);
    showToast('Workspace backup exported');
  };

  // Import JSON file
  const handleImportFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      try {
        const content = reader.result as string;
        importStateJson(content);
      } catch (err) {
        showToast('Invalid backup file');
      }
    };
    reader.readAsText(file);
    e.target.value = '';
  };

  return (
    <div
      id="settings-screen"
      className="flex-1 min-h-0 overflow-y-auto bg-black text-white p-4 select-none"
    >
      <div className="max-w-md mx-auto space-y-6 pb-8">
        <div>
          <h2 className="text-xl font-bold tracking-tight text-white">Settings</h2>
          <p className="text-xs text-neutral-400">
            Multi-AI keys, model routing, appearance, and backup storage
          </p>
        </div>

        {/* Tab Switcher */}
        <div className="flex items-center gap-1.5 p-1 bg-neutral-900 rounded-2xl border border-neutral-800">
          <button
            id="settings-tab-ai"
            type="button"
            onClick={() => setActiveTab('ai')}
            className={`flex-1 flex items-center justify-center gap-1.5 py-2 px-2 text-xs font-semibold rounded-xl transition-all ${
              activeTab === 'ai'
                ? 'bg-white text-black shadow-sm'
                : 'text-neutral-400 hover:text-white'
            }`}
          >
            <Key className="w-3.5 h-3.5" />
            <span>AI Accounts</span>
          </button>
          <button
            id="settings-tab-appearance"
            type="button"
            onClick={() => setActiveTab('appearance')}
            className={`flex-1 flex items-center justify-center gap-1.5 py-2 px-2 text-xs font-semibold rounded-xl transition-all ${
              activeTab === 'appearance'
                ? 'bg-white text-black shadow-sm'
                : 'text-neutral-400 hover:text-white'
            }`}
          >
            <Palette className="w-3.5 h-3.5" />
            <span>Appearance</span>
          </button>
          <button
            id="settings-tab-system"
            type="button"
            onClick={() => setActiveTab('system')}
            className={`flex-1 flex items-center justify-center gap-1.5 py-2 px-2 text-xs font-semibold rounded-xl transition-all ${
              activeTab === 'system'
                ? 'bg-white text-black shadow-sm'
                : 'text-neutral-400 hover:text-white'
            }`}
          >
            <HardDrive className="w-3.5 h-3.5" />
            <span>System</span>
          </button>
        </div>

        <SwipeableTabContainer
          tabs={['ai', 'appearance', 'system'] as const}
          activeTab={activeTab}
          onTabChange={setActiveTab}
        >
          {/* TAB 1: AI Accounts & Keys */}
          {activeTab === 'ai' && <AIAccountsSettings />}

        {/* TAB 2: Appearance */}
        {activeTab === 'appearance' && (
          <div className="space-y-6">
            {/* SECTION 1: Interface Theme & Accent */}
            <div className="rounded-2xl bg-neutral-900/40 border border-neutral-800/80 p-5 space-y-5">
              <div className="flex items-center gap-2.5">
                <Palette className="w-4 h-4 text-neutral-300" />
                <div>
                  <h3 className="text-sm font-semibold text-white">Visual Design & Theme</h3>
                  <p className="text-xs text-neutral-400">Claude-inspired monochrome dark aesthetic with custom accents</p>
                </div>
              </div>

              {/* Light / Dark Mode Toggle */}
              <div className="flex items-center justify-between pt-1">
                <div>
                  <p className="text-xs font-medium text-neutral-200">Color Mode</p>
                  <p className="text-[11px] text-neutral-400">
                    Switch between deep dark and light workspace modes
                  </p>
                </div>
                <div className="flex items-center bg-neutral-950 p-1 rounded-xl border border-neutral-800">
                  <button
                    type="button"
                    onClick={() => setThemeMode('dark')}
                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                      theme.mode === 'dark'
                        ? 'bg-neutral-800 text-white shadow-sm border border-neutral-700'
                        : 'text-neutral-400 hover:text-white'
                    }`}
                  >
                    <Moon className="w-3.5 h-3.5" />
                    <span>Dark</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setThemeMode('light')}
                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                      theme.mode === 'light'
                        ? 'bg-white text-black shadow-sm'
                        : 'text-neutral-400 hover:text-white'
                    }`}
                  >
                    <Sun className="w-3.5 h-3.5" />
                    <span>Light</span>
                  </button>
                </div>
              </div>

              {/* Accent Color Swatches */}
              <div className="pt-3 border-t border-neutral-800/60">
                <div className="flex items-center justify-between mb-2.5">
                  <p className="text-xs font-medium text-neutral-200">Accent Highlight</p>
                  <span className="text-[11px] text-neutral-400 font-mono">
                    {theme.accentColor || '#ffffff'}
                  </span>
                </div>
                <div className="flex items-center gap-3">
                  {[
                    { hex: '#ffffff', name: 'Monochrome White' },
                    { hex: '#3b82f6', name: 'Cyber Blue' },
                    { hex: '#10b981', name: 'Emerald' },
                    { hex: '#a855f7', name: 'Violet' },
                    { hex: '#f59e0b', name: 'Amber' },
                  ].map((swatch) => (
                    <button
                      key={swatch.hex}
                      type="button"
                      onClick={() => setAccentColor(swatch.hex)}
                      title={swatch.name}
                      className={`w-7 h-7 rounded-full flex items-center justify-center transition-transform active:scale-95 ${
                        theme.accentColor === swatch.hex
                          ? 'ring-2 ring-white ring-offset-2 ring-offset-neutral-900 scale-110'
                          : 'opacity-70 hover:opacity-100'
                      }`}
                      style={{ backgroundColor: swatch.hex }}
                    >
                      {theme.accentColor === swatch.hex && (
                        <Check
                          className={`w-3.5 h-3.5 ${
                            swatch.hex === '#ffffff' ? 'text-black' : 'text-white'
                          }`}
                        />
                      )}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* SECTION 2: Chat Bubbles & Action Button Colors */}
            <div className="rounded-2xl bg-neutral-900/40 border border-neutral-800/80 p-5 space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <Sparkles className="w-4 h-4 text-neutral-300" />
                  <div>
                    <h3 className="text-sm font-semibold text-white">Chat Bubbles & Action Buttons</h3>
                    <p className="text-xs text-neutral-400">
                      Customize message colors with automatic contrast verification
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={resetThemeToDefault}
                  className="text-xs text-neutral-400 hover:text-white flex items-center gap-1.5 px-2.5 py-1 rounded-lg hover:bg-neutral-800 transition-colors"
                  title="Restore default monochrome theme"
                >
                  <RotateCcw className="w-3 h-3" />
                  <span>Reset</span>
                </button>
              </div>

              {(() => {
                const fColors = theme.functionColors || {};
                const autoContrast = fColors.messageButtonAutoContrast !== false;

                // User Message Colors
                const userBubbleBg = fColors.userBubbleColor || fColors.userChatBubbleBg || '#ffffff';
                const userBtnColor = fColors.userMsgBtnColor || '#000000';
                const effectiveUserBtn = resolveMessageButtonColor(userBtnColor, userBubbleBg, autoContrast);
                const userRatio = Math.round(getContrastRatio(effectiveUserBtn, userBubbleBg) * 10) / 10;
                const userQuality = getContrastQuality(userRatio);
                const userRecs = getRecommendedColors(userBubbleBg);

                // AXON Message Colors
                const axonBubbleBg = fColors.axonBubbleColor || fColors.aiChatBubbleBg || '#171717';
                const axonBtnColor = fColors.axonMsgBtnColor || '#ffffff';
                const effectiveAxonBtn = resolveMessageButtonColor(axonBtnColor, axonBubbleBg, autoContrast);
                const axonRatio = Math.round(getContrastRatio(effectiveAxonBtn, axonBubbleBg) * 10) / 10;
                const axonQuality = getContrastQuality(axonRatio);
                const axonRecs = getRecommendedColors(axonBubbleBg);

                return (
                  <div className="space-y-4">
                    {/* Smart Contrast Guard */}
                    <div className="flex items-center justify-between p-3.5 rounded-xl bg-neutral-950/60 border border-neutral-800/80">
                      <div className="flex items-center gap-3">
                        <div className="p-2 rounded-xl bg-neutral-800/80 text-emerald-400">
                          <ShieldCheck className="w-4 h-4" />
                        </div>
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="text-xs font-semibold text-white">Smart Contrast Guard</span>
                            <span className="text-[10px] px-1.5 py-0.5 rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 font-mono">
                              WCAG 2.1
                            </span>
                          </div>
                          <p className="text-[11px] text-neutral-400">
                            Auto-adjusts button icons to maintain clear readability
                          </p>
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={() =>
                          setFunctionColor('messageButtonAutoContrast' as any, (!autoContrast) as any)
                        }
                        className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all flex items-center gap-1.5 shrink-0 ${
                          autoContrast
                            ? 'bg-white text-black hover:bg-neutral-200'
                            : 'bg-neutral-800 text-neutral-300 hover:bg-neutral-700'
                        }`}
                      >
                        {autoContrast ? <Check className="w-3.5 h-3.5" /> : null}
                        <span>{autoContrast ? 'Auto Active' : 'Manual'}</span>
                      </button>
                    </div>

                    {/* User Message Bubble Setting */}
                    <div className="p-4 rounded-xl bg-neutral-950/60 border border-neutral-800/80 space-y-3">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <div className="p-2 rounded-xl bg-neutral-800/80 text-neutral-300">
                            <User className="w-4 h-4" />
                          </div>
                          <div>
                            <p className="text-xs font-semibold text-white">User Message Bubble</p>
                            <p className="text-[11px] text-neutral-400">Background and icon colors</p>
                          </div>
                        </div>
                        <span
                          className="text-[10px] font-mono font-medium px-2 py-0.5 rounded border shrink-0"
                          style={{
                            color: userQuality.color,
                            borderColor: `${userQuality.color}40`,
                            backgroundColor: `${userQuality.color}15`,
                          }}
                        >
                          {userRatio}:1 {userQuality.label}
                        </span>
                      </div>

                      {/* Controls: Bubble Color & Button Icons */}
                      <div className="grid grid-cols-2 gap-2.5">
                        <label className="p-2.5 rounded-xl bg-neutral-900/80 border border-neutral-800 flex items-center justify-between cursor-pointer">
                          <span className="text-xs text-neutral-300">Bubble Color</span>
                          <div className="flex items-center gap-2">
                            <span className="font-mono text-[10px] text-neutral-400 uppercase">{userBubbleBg}</span>
                            <input
                              type="color"
                              value={userBubbleBg}
                              onChange={(e) => {
                                setFunctionColor('userBubbleColor', e.target.value);
                                setFunctionColor('userChatBubbleBg', e.target.value);
                              }}
                              className="w-6 h-6 rounded cursor-pointer border-0 bg-transparent"
                              title="Choose user chat bubble background"
                            />
                          </div>
                        </label>
                        <label className="p-2.5 rounded-xl bg-neutral-900/80 border border-neutral-800 flex items-center justify-between cursor-pointer">
                          <span className="text-xs text-neutral-300">Button Icons</span>
                          <div className="flex items-center gap-2">
                            <span className="font-mono text-[10px] text-neutral-400 uppercase">{effectiveUserBtn}</span>
                            <input
                              type="color"
                              value={effectiveUserBtn}
                              onChange={(e) => setFunctionColor('userMsgBtnColor', e.target.value)}
                              className="w-6 h-6 rounded cursor-pointer border-0 bg-transparent"
                              title="Choose user message action buttons color"
                            />
                          </div>
                        </label>
                      </div>

                      {/* Live Preview User Bubble (non-overlapping, responsive) */}
                      <div className="p-3 rounded-xl bg-neutral-900/40 border border-neutral-800/60">
                        <div className="flex items-center justify-between mb-2 text-[10px] text-neutral-400">
                          <span className="flex items-center gap-1">
                            <Eye className="w-3 h-3 text-neutral-400" />
                            Live Preview
                          </span>
                          <button
                            type="button"
                            onClick={() =>
                              setFunctionColor('userMsgBtnColor', getAutoContrastColor(userBubbleBg))
                            }
                            className="text-[10px] text-neutral-300 hover:text-white underline underline-offset-2"
                          >
                            Set Optimal
                          </button>
                        </div>
                        <div className="flex justify-end">
                          <div
                            style={{ backgroundColor: userBubbleBg }}
                            className="w-full max-w-sm rounded-xl p-3 text-xs text-black shadow-sm"
                          >
                            <p className="font-normal leading-relaxed text-black">
                              Can you see these action buttons clearly?
                            </p>
                            <div className="flex items-center justify-between gap-2 mt-2 pt-1.5 border-t border-black/15 text-[10px]">
                              <span className="opacity-70 font-mono shrink-0">10:42 AM</span>
                              <div className="flex items-center gap-1 shrink-0">
                                <span style={{ color: effectiveUserBtn }} className="p-1 rounded bg-black/5" title="Read aloud">
                                  <Volume2 className="w-3 h-3" />
                                </span>
                                <span style={{ color: effectiveUserBtn }} className="p-1 rounded bg-black/5" title="Copy text">
                                  <Copy className="w-3 h-3" />
                                </span>
                                <span style={{ color: effectiveUserBtn }} className="p-1 rounded bg-black/5" title="Bookmark">
                                  <BookmarkPlus className="w-3 h-3" />
                                </span>
                                <span style={{ color: effectiveUserBtn }} className="p-1 rounded bg-black/5" title="Delete">
                                  <Trash2 className="w-3.5 h-3.5" />
                                </span>
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>

                      {/* Recommended Swatches */}
                      <div className="flex items-center gap-1.5 flex-wrap pt-0.5">
                        <span className="text-[10px] uppercase font-semibold tracking-wider text-neutral-400 mr-1">
                          Recommended:
                        </span>
                        {userRecs.map((rec) => {
                          const isCurrent = effectiveUserBtn.toLowerCase() === rec.hex.toLowerCase();
                          return (
                            <button
                              key={rec.hex}
                              type="button"
                              onClick={() => setFunctionColor('userMsgBtnColor', rec.hex)}
                              className={`px-2 py-0.5 rounded-md text-[10px] flex items-center gap-1.5 transition-all border ${
                                isCurrent
                                  ? 'bg-neutral-800 border-white text-white font-medium'
                                  : 'bg-neutral-900 hover:bg-neutral-800 border-neutral-800 text-neutral-300'
                              }`}
                              title={`Apply ${rec.name} (${rec.contrastRatio}:1)`}
                            >
                              <span className="w-2 h-2 rounded-full border border-black/20 shrink-0" style={{ backgroundColor: rec.hex }} />
                              <span>{rec.name}</span>
                            </button>
                          );
                        })}
                      </div>
                    </div>

                    {/* AI (AXON) Message Bubble Setting */}
                    <div className="p-4 rounded-xl bg-neutral-950/60 border border-neutral-800/80 space-y-3">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <div className="p-2 rounded-xl bg-neutral-800/80 text-neutral-300">
                            <Sparkles className="w-4 h-4" />
                          </div>
                          <div>
                            <p className="text-xs font-semibold text-white">AI (AXON) Message Bubble</p>
                            <p className="text-[11px] text-neutral-400">Background and icon colors</p>
                          </div>
                        </div>
                        <span
                          className="text-[10px] font-mono font-medium px-2 py-0.5 rounded border shrink-0"
                          style={{
                            color: axonQuality.color,
                            borderColor: `${axonQuality.color}40`,
                            backgroundColor: `${axonQuality.color}15`,
                          }}
                        >
                          {axonRatio}:1 {axonQuality.label}
                        </span>
                      </div>

                      {/* Controls */}
                      <div className="grid grid-cols-2 gap-2.5">
                        <label className="p-2.5 rounded-xl bg-neutral-900/80 border border-neutral-800 flex items-center justify-between cursor-pointer">
                          <span className="text-xs text-neutral-300">Bubble Color</span>
                          <div className="flex items-center gap-2">
                            <span className="font-mono text-[10px] text-neutral-400 uppercase">{axonBubbleBg}</span>
                            <input
                              type="color"
                              value={axonBubbleBg}
                              onChange={(e) => {
                                setFunctionColor('axonBubbleColor', e.target.value);
                                setFunctionColor('aiChatBubbleBg', e.target.value);
                              }}
                              className="w-6 h-6 rounded cursor-pointer border-0 bg-transparent"
                              title="Choose AXON chat bubble background"
                            />
                          </div>
                        </label>
                        <label className="p-2.5 rounded-xl bg-neutral-900/80 border border-neutral-800 flex items-center justify-between cursor-pointer">
                          <span className="text-xs text-neutral-300">Button Icons</span>
                          <div className="flex items-center gap-2">
                            <span className="font-mono text-[10px] text-neutral-400 uppercase">{effectiveAxonBtn}</span>
                            <input
                              type="color"
                              value={effectiveAxonBtn}
                              onChange={(e) => setFunctionColor('axonMsgBtnColor', e.target.value)}
                              className="w-6 h-6 rounded cursor-pointer border-0 bg-transparent"
                              title="Choose AXON message action buttons color"
                            />
                          </div>
                        </label>
                      </div>

                      {/* Live Preview AI Bubble (non-overlapping, responsive) */}
                      <div className="p-3 rounded-xl bg-neutral-900/40 border border-neutral-800/60">
                        <div className="flex items-center justify-between mb-2 text-[10px] text-neutral-400">
                          <span className="flex items-center gap-1">
                            <Eye className="w-3 h-3 text-neutral-400" />
                            Live Preview
                          </span>
                          <button
                            type="button"
                            onClick={() =>
                              setFunctionColor('axonMsgBtnColor', getAutoContrastColor(axonBubbleBg))
                            }
                            className="text-[10px] text-neutral-300 hover:text-white underline underline-offset-2"
                          >
                            Set Optimal
                          </button>
                        </div>
                        <div className="flex justify-start">
                          <div
                            style={{ backgroundColor: axonBubbleBg }}
                            className="w-full max-w-sm rounded-xl p-3 text-xs text-neutral-100 border border-neutral-800/80 shadow-sm"
                          >
                            <p className="font-normal leading-relaxed text-neutral-100">
                              All action buttons are crystal clear and contrast-verified.
                            </p>
                            <div className="flex items-center justify-between gap-2 mt-2 pt-1.5 border-t border-white/10 text-[10px]">
                              <span className="opacity-70 font-mono shrink-0">10:42 AM</span>
                              <div className="flex items-center gap-1 shrink-0">
                                <span style={{ color: effectiveAxonBtn }} className="p-1 rounded bg-white/10" title="Read aloud">
                                  <Volume2 className="w-3 h-3" />
                                </span>
                                <span style={{ color: effectiveAxonBtn }} className="p-1 rounded bg-white/10" title="Copy text">
                                  <Copy className="w-3 h-3" />
                                </span>
                                <span style={{ color: effectiveAxonBtn }} className="p-1 rounded bg-white/10" title="Bookmark">
                                  <BookmarkPlus className="w-3 h-3" />
                                </span>
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>

                      {/* Recommended Swatches */}
                      <div className="flex items-center gap-1.5 flex-wrap pt-0.5">
                        <span className="text-[10px] uppercase font-semibold tracking-wider text-neutral-400 mr-1">
                          Recommended:
                        </span>
                        {axonRecs.map((rec) => {
                          const isCurrent = effectiveAxonBtn.toLowerCase() === rec.hex.toLowerCase();
                          return (
                            <button
                              key={rec.hex}
                              type="button"
                              onClick={() => setFunctionColor('axonMsgBtnColor', rec.hex)}
                              className={`px-2 py-0.5 rounded-md text-[10px] flex items-center gap-1.5 transition-all border ${
                                isCurrent
                                  ? 'bg-neutral-800 border-white text-white font-medium'
                                  : 'bg-neutral-900 hover:bg-neutral-800 border-neutral-800 text-neutral-300'
                              }`}
                              title={`Apply ${rec.name} (${rec.contrastRatio}:1)`}
                            >
                              <span className="w-2 h-2 rounded-full border border-black/20 shrink-0" style={{ backgroundColor: rec.hex }} />
                              <span>{rec.name}</span>
                            </button>
                          );
                        })}
                      </div>
                    </div>

                    {/* Chat Input & Send Button */}
                    <div className="p-4 rounded-xl bg-neutral-950/60 border border-neutral-800/80 space-y-3">
                      <div className="flex items-center gap-3">
                        <div className="p-2 rounded-xl bg-neutral-800/80 text-neutral-300">
                          <Send className="w-4 h-4" />
                        </div>
                        <div>
                          <p className="text-xs font-semibold text-white">Input Bar & Send Button</p>
                          <p className="text-[11px] text-neutral-400">Bottom composer field appearance</p>
                        </div>
                      </div>
                      <div className="grid grid-cols-2 gap-2.5">
                        <label className="p-2.5 rounded-xl bg-neutral-900/80 border border-neutral-800 flex items-center justify-between cursor-pointer">
                          <span className="text-xs text-neutral-300">Send Button</span>
                          <div className="flex items-center gap-2">
                            <span className="font-mono text-[10px] text-neutral-400 uppercase">{fColors.sendButtonColor || '#ffffff'}</span>
                            <input
                              type="color"
                              value={fColors.sendButtonColor || '#ffffff'}
                              onChange={(e) => setFunctionColor('sendButtonColor', e.target.value)}
                              className="w-6 h-6 rounded cursor-pointer border-0 bg-transparent"
                              title="Choose send button color"
                            />
                          </div>
                        </label>
                        <label className="p-2.5 rounded-xl bg-neutral-900/80 border border-neutral-800 flex items-center justify-between cursor-pointer">
                          <span className="text-xs text-neutral-300">Input Background</span>
                          <div className="flex items-center gap-2">
                            <span className="font-mono text-[10px] text-neutral-400 uppercase">{fColors.chatInputBg || '#171717'}</span>
                            <input
                              type="color"
                              value={fColors.chatInputBg || '#171717'}
                              onChange={(e) => setFunctionColor('chatInputBg', e.target.value)}
                              className="w-6 h-6 rounded cursor-pointer border-0 bg-transparent"
                              title="Choose chat input background color"
                            />
                          </div>
                        </label>
                      </div>
                    </div>

                    {/* Color Mixer Link */}
                    <button
                      type="button"
                      onClick={() => navigateTo('tool_colors')}
                      className="w-full flex items-center justify-between p-3.5 rounded-xl bg-neutral-950/60 border border-neutral-800/80 hover:bg-neutral-850 hover:border-neutral-700 transition-colors text-left group"
                    >
                      <div className="flex items-center gap-3">
                        <div className="p-2 rounded-xl bg-neutral-800/80 text-neutral-300 group-hover:text-white">
                          <Palette className="w-4 h-4" />
                        </div>
                        <div>
                          <p className="text-xs font-semibold text-white">Color Mixer & Palette Tool</p>
                          <p className="text-[11px] text-neutral-400">Open full color harmonies and custom palette tools</p>
                        </div>
                      </div>
                      <ChevronRight className="w-4 h-4 text-neutral-500 group-hover:text-neutral-300 transition-colors" />
                    </button>
                  </div>
                );
              })()}
            </div>

            {/* SECTION 3: App Icon System */}
            <div className="rounded-2xl bg-neutral-900/40 border border-neutral-800/80 p-5 space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <Smartphone className="w-4 h-4 text-neutral-300" />
                  <div>
                    <h3 className="text-sm font-semibold text-white">App Icon</h3>
                    <p className="text-xs text-neutral-400">Launcher icon displayed on home screen</p>
                  </div>
                </div>
                {/* Live Preview of current App Icon */}
                <div className="p-1 rounded-2xl bg-neutral-950 border border-neutral-800">
                  <AxonLogo
                    size={40}
                    preset={icons.appIconType === 'preset' ? icons.appIconPreset : undefined}
                    customUrl={icons.appIconType === 'custom' ? icons.appIconCustomUrl : undefined}
                  />
                </div>
              </div>

              {/* Built-in Preset selector */}
              <div className="space-y-2">
                <p className="text-xs text-neutral-300 font-medium">Icon Styles</p>
                <div className="grid grid-cols-2 gap-2">
                  {presets.map((p) => {
                    const isSelected =
                      icons.appIconType === 'preset' && icons.appIconPreset === p.id;
                    return (
                      <button
                        key={p.id}
                        type="button"
                        onClick={() => setAppIconPreset(p.id)}
                        className={`flex items-center gap-2.5 p-2.5 rounded-xl border text-left transition-all ${
                          isSelected
                            ? 'bg-neutral-800 border-white text-white shadow-sm'
                            : 'bg-neutral-950/60 border-neutral-800/80 text-neutral-400 hover:text-white hover:border-neutral-700'
                        }`}
                      >
                        <AxonLogo size={26} preset={p.id} glow={false} />
                        <div className="min-w-0 flex-1">
                          <p className="text-xs font-semibold truncate leading-tight">{p.name}</p>
                          <p className="text-[10px] text-neutral-500 truncate">{p.desc}</p>
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Custom App Icon Actions */}
              <div className="pt-2 border-t border-neutral-800/60 flex items-center justify-between">
                <input
                  ref={appIconFileInputRef}
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={handleCustomAppIconUpload}
                />

                <button
                  id="upload-app-icon-btn"
                  type="button"
                  onClick={() => appIconFileInputRef.current?.click()}
                  className="flex items-center gap-2 px-3 py-2 rounded-xl bg-neutral-800 hover:bg-neutral-700 text-xs font-medium text-white transition-colors"
                >
                  <Upload className="w-3.5 h-3.5" />
                  <span>Choose from Gallery</span>
                </button>

                {icons.appIconType === 'custom' && (
                  <button
                    id="revert-app-icon-btn"
                    type="button"
                    onClick={handleDeleteCustomAppIcon}
                    className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs text-red-400 hover:bg-red-950/40 border border-red-900/40 transition-colors"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                    <span>Revert to Default</span>
                  </button>
                )}
              </div>
            </div>

            {/* SECTION 4: Chat Avatar System */}
            <div className="rounded-2xl bg-neutral-900/40 border border-neutral-800/80 p-5 space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <User className="w-4 h-4 text-neutral-300" />
                  <div>
                    <h3 className="text-sm font-semibold text-white">Chat Avatar</h3>
                    <p className="text-xs text-neutral-400">Profile badge shown next to AXON responses</p>
                  </div>
                </div>
                {/* Live Preview of current Chat Avatar */}
                <div className="p-1 rounded-full bg-neutral-950 border border-neutral-800">
                  <AxonLogo
                    size={38}
                    preset={icons.avatarType === 'preset' ? icons.avatarPreset : undefined}
                    customUrl={icons.avatarType === 'custom' ? icons.avatarCustomUrl : undefined}
                  />
                </div>
              </div>

              {/* Sync Switch */}
              <div className="p-3 rounded-xl bg-neutral-950/60 border border-neutral-800/80 flex items-center justify-between">
                <div>
                  <p className="text-xs font-semibold text-white">
                    Use same image for icon & avatar
                  </p>
                  <p className="text-[11px] text-neutral-400">
                    Synchronizes app launcher icon with chat avatar
                  </p>
                </div>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input
                    id="sync-icon-avatar-toggle"
                    type="checkbox"
                    checked={icons.syncAppIconAndAvatar}
                    onChange={(e) => setSyncAppIconAndAvatar(e.target.checked)}
                    className="sr-only peer"
                  />
                  <div className="w-9 h-5 bg-neutral-800 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-white"></div>
                </label>
              </div>

              {/* Built-in Avatar styles */}
              <div className="space-y-2">
                <p className="text-xs text-neutral-300 font-medium">Avatar Styles</p>
                <div className="grid grid-cols-2 gap-2">
                  {presets.map((p) => {
                    const isSelected =
                      icons.avatarType === 'preset' && icons.avatarPreset === p.id;
                    return (
                      <button
                        key={p.id}
                        type="button"
                        onClick={() => setAvatarPreset(p.id)}
                        className={`flex items-center gap-2.5 p-2.5 rounded-xl border text-left transition-all ${
                          isSelected
                            ? 'bg-neutral-800 border-white text-white shadow-sm'
                            : 'bg-neutral-950/60 border-neutral-800/80 text-neutral-400 hover:text-white hover:border-neutral-700'
                        }`}
                      >
                        <AxonLogo size={26} preset={p.id} glow={false} />
                        <div className="min-w-0 flex-1">
                          <p className="text-xs font-semibold truncate leading-tight">{p.name}</p>
                          <p className="text-[10px] text-neutral-500 truncate">{p.desc}</p>
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Avatar actions */}
              <div className="pt-2 border-t border-neutral-800/60 flex flex-wrap items-center gap-2">
                <input
                  ref={avatarFileInputRef}
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={handleCustomAvatarUpload}
                />

                <button
                  id="upload-avatar-btn"
                  type="button"
                  onClick={() => avatarFileInputRef.current?.click()}
                  className="flex items-center gap-2 px-3 py-2 rounded-xl bg-neutral-800 hover:bg-neutral-700 text-xs font-medium text-white transition-colors"
                >
                  <Upload className="w-3.5 h-3.5" />
                  <span>Gallery Avatar</span>
                </button>

                {icons.avatarType === 'custom' && (
                  <button
                    id="remove-avatar-btn"
                    type="button"
                    onClick={handleDeleteCustomAvatar}
                    className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs text-neutral-300 hover:text-white bg-neutral-950 hover:bg-neutral-800 border border-neutral-800 transition-colors"
                  >
                    <RotateCcw className="w-3.5 h-3.5" />
                    <span>Revert to Default</span>
                  </button>
                )}

                {icons.avatarType === 'preset' && icons.previousAvatarCustomUrl && (
                  <button
                    id="restore-avatar-btn"
                    type="button"
                    onClick={restoreAvatar}
                    className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs text-neutral-200 hover:text-white bg-neutral-800 hover:bg-neutral-750 border border-neutral-700 transition-colors"
                  >
                    <Undo2 className="w-3.5 h-3.5" />
                    <span>Restore Custom Avatar</span>
                  </button>
                )}
              </div>
            </div>
          </div>
        )}

        {/* TAB 3: System & Storage */}
        {activeTab === 'system' && (
          <div className="space-y-6">
            {/* SECTION 1: Account & Notifications */}
            <div className="rounded-2xl bg-neutral-900/40 border border-neutral-800/80">
              <button
                id="settings-account-row"
                type="button"
                onClick={() => navigateTo('account')}
                className="w-full flex items-center justify-between p-4 hover:bg-neutral-800/40 transition-colors text-left group first:rounded-t-2xl"
              >
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-xl bg-neutral-800/80 text-neutral-300 group-hover:text-white">
                    <User className="w-4 h-4" />
                  </div>
                  <div>
                    <p className="text-xs font-semibold text-white">Account</p>
                    <p className="text-[11px] text-neutral-400">
                      Local device profile and cloud sync setup
                    </p>
                  </div>
                </div>
                <ChevronRight className="w-4 h-4 text-neutral-500 group-hover:text-neutral-300 transition-colors" />
              </button>

              <button
                id="settings-notifications-row"
                type="button"
                onClick={() => navigateTo('notifications')}
                className="w-full flex items-center justify-between p-4 hover:bg-neutral-800/40 transition-colors text-left group last:rounded-b-2xl"
              >
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-xl bg-neutral-800/80 text-neutral-300 group-hover:text-white">
                    <Bell className="w-4 h-4" />
                  </div>
                  <div>
                    <p className="text-xs font-semibold text-white">Notifications</p>
                    <p className="text-[11px] text-neutral-400">
                      Status alerts and low-latency sound cues
                    </p>
                  </div>
                </div>
                <ChevronRight className="w-4 h-4 text-neutral-500 group-hover:text-neutral-300 transition-colors" />
              </button>
            </div>

            {/* SECTION 2: Storage & Manifest Overview */}
            <div className="rounded-2xl bg-neutral-900/40 border border-neutral-800/80 p-5 space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <HardDrive className="w-4 h-4 text-neutral-300" />
                  <div>
                    <h3 className="text-sm font-semibold text-white">Storage & Manifest</h3>
                    <p className="text-xs text-neutral-400">
                      {formatBytes(storageBreakdown.totalStoredBytes)} used of {formatBytes(storageBudget.budgetBytes, 0)} budget
                    </p>
                  </div>
                </div>
                <button
                  id="settings-open-storage-diagnostics-btn"
                  type="button"
                  onClick={() => navigateTo('storage')}
                  className="px-3 py-1.5 rounded-xl bg-white hover:bg-neutral-200 text-black text-xs font-semibold flex items-center gap-1 transition-colors"
                >
                  <span>Manage Storage</span>
                  <ChevronRight className="w-3.5 h-3.5" />
                </button>
              </div>

              <div className="p-3 rounded-xl bg-neutral-950/60 border border-neutral-800/80 flex items-center justify-between text-xs">
                <div>
                  <span className="text-neutral-400 text-[11px]">Active Tracking Mode</span>
                  <div className="font-semibold text-white mt-0.5">
                    Lossless Archive + Space-Saver Opt-In
                  </div>
                </div>
                <span className="text-[11px] font-mono font-medium text-emerald-400 bg-emerald-950/40 px-2 py-0.5 rounded-full border border-emerald-800/60">
                  {Math.round((1 - storageBreakdown.overallCompressionRatio) * 100)}% compressed
                </span>
              </div>
            </div>

            {/* SECTION 3: Backup & Restore (With clear plain-language descriptions) */}
            <div className="rounded-2xl bg-neutral-900/40 border border-neutral-800/80 p-5 space-y-4">
              <div>
                <h3 className="text-sm font-semibold text-white">Backup & Migration</h3>
                <p className="text-xs text-neutral-400">
                  Export or restore all workspace chats, notes, and local configuration
                </p>
              </div>

              <div className="space-y-3">
                {/* Export JSON Card */}
                <div className="p-3.5 rounded-xl bg-neutral-950/60 border border-neutral-800/80 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div className="space-y-0.5">
                    <p className="text-xs font-semibold text-white flex items-center gap-1.5">
                      <Download className="w-3.5 h-3.5 text-neutral-400" />
                      <span>Export Workspace Backup</span>
                    </p>
                    <p className="text-[11px] text-neutral-400 leading-relaxed">
                      Download a complete backup JSON file containing all your conversations, notes, custom settings, and preferences.
                    </p>
                  </div>
                  <button
                    id="export-workspace-backup-btn"
                    type="button"
                    onClick={handleExportData}
                    className="self-start sm:self-center shrink-0 flex items-center gap-2 px-3.5 py-2 rounded-xl bg-white hover:bg-neutral-200 text-black text-xs font-semibold transition-colors"
                  >
                    <Download className="w-3.5 h-3.5" />
                    <span>Export JSON</span>
                  </button>
                </div>

                {/* Restore JSON Card */}
                <div className="p-3.5 rounded-xl bg-neutral-950/60 border border-neutral-800/80 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div className="space-y-0.5">
                    <p className="text-xs font-semibold text-white flex items-center gap-1.5">
                      <UploadCloud className="w-3.5 h-3.5 text-neutral-400" />
                      <span>Restore Workspace Backup</span>
                    </p>
                    <p className="text-[11px] text-neutral-400 leading-relaxed">
                      Upload and restore your workspace data from a previously downloaded JSON backup file.
                    </p>
                  </div>
                  <button
                    id="import-workspace-backup-btn"
                    type="button"
                    onClick={() => restoreFileInputRef.current?.click()}
                    className="self-start sm:self-center shrink-0 flex items-center gap-2 px-3.5 py-2 rounded-xl bg-neutral-800 hover:bg-neutral-700 text-white text-xs font-medium transition-colors"
                  >
                    <UploadCloud className="w-3.5 h-3.5" />
                    <span>Restore JSON</span>
                  </button>
                  <input
                    ref={restoreFileInputRef}
                    type="file"
                    accept=".json,application/json"
                    className="hidden"
                    onChange={handleImportFile}
                  />
                </div>
              </div>
            </div>

            {/* SECTION 4: Factory Reset State */}
            <div className="rounded-2xl bg-neutral-900/40 border border-neutral-800/80 p-5 flex items-center justify-between gap-3">
              <div>
                <p className="text-xs font-semibold text-neutral-300">Factory State Reset</p>
                <p className="text-[11px] text-neutral-500">
                  Erase local data, custom themes, and cached assets
                </p>
              </div>
              <button
                id="reset-all-data-btn"
                type="button"
                onClick={resetAllData}
                className="text-xs font-medium text-red-400 hover:text-red-300 px-3 py-1.5 rounded-xl hover:bg-red-950/30 transition-colors shrink-0"
              >
                Reset All Workspace Data
              </button>
            </div>
          </div>
        )}
        </SwipeableTabContainer>
      </div>
    </div>
  );
};
