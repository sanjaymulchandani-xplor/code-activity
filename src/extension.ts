import * as vscode from 'vscode';

interface LanguageStats {
    [languageId: string]: {
        totalTime: number;
        lastActive: number;
        fileCount: number;
    };
}

interface DailyStats {
    [date: string]: {
        [languageId: string]: number;
    };
}

interface HourlyStats {
    [hour: number]: number;
}

interface SessionData {
    currentLanguage: string | null;
    sessionStart: number;
    sessionSeconds: number;
}

interface StoredData {
    languageStats: LanguageStats;
    dailyStats: DailyStats;
    hourlyStats: HourlyStats;
    version: number;
}

const LANGUAGE_COLORS: { [key: string]: string } = {
    typescript: '#3178C6',
    javascript: '#F7DF1E',
    python: '#3776AB',
    java: '#ED8B00',
    go: '#00ADD8',
    rust: '#DEA584',
    cpp: '#00599C',
    c: '#A8B9CC',
    csharp: '#239120',
    php: '#777BB4',
    ruby: '#CC342D',
    swift: '#FA7343',
    kotlin: '#7F52FF',
    html: '#E34F26',
    css: '#1572B6',
    scss: '#CC6699',
    json: '#292929',
    markdown: '#083FA1',
    yaml: '#CB171E',
    sql: '#336791',
    shell: '#89E051',
    powershell: '#5391FE',
    dockerfile: '#2496ED',
    vue: '#4FC08D',
    react: '#61DAFB',
    svelte: '#FF3E00',
};

class CodeActivityTracker {
    private stats: LanguageStats = {};
    private dailyStats: DailyStats = {};
    private hourlyStats: HourlyStats = {};
    private session: SessionData = { currentLanguage: null, sessionStart: 0, sessionSeconds: 0 };
    private statusBarItem: vscode.StatusBarItem;
    private context: vscode.ExtensionContext;
    private updateInterval: NodeJS.Timeout | null = null;
    private saveInterval: NodeJS.Timeout | null = null;

    constructor(context: vscode.ExtensionContext) {
        this.context = context;
        this.statusBarItem = vscode.window.createStatusBarItem(
            vscode.StatusBarAlignment.Right,
            100
        );
        this.statusBarItem.command = 'codeActivity.showStats';
        this.statusBarItem.tooltip = 'Click to view your coding activity';
        
        for (let i = 0; i < 24; i++) {
            this.hourlyStats[i] = 0;
        }
        
        this.loadStats();
        this.setupListeners();
        this.updateStatusBar();
        this.statusBarItem.show();

        this.updateInterval = setInterval(() => this.tick(), 1000);
        this.saveInterval = setInterval(() => this.saveStats(), 300000);
    }

    private loadStats(): void {
        const savedData = this.context.globalState.get<StoredData>('codeActivityData');
        if (savedData) {
            this.stats = savedData.languageStats || {};
            this.dailyStats = savedData.dailyStats || {};
            this.hourlyStats = savedData.hourlyStats || {};
            
            for (let i = 0; i < 24; i++) {
                if (this.hourlyStats[i] === undefined) {
                    this.hourlyStats[i] = 0;
                }
            }
        }
    }

    private async saveStats(): Promise<void> {
        const data: StoredData = {
            languageStats: this.stats,
            dailyStats: this.dailyStats,
            hourlyStats: this.hourlyStats,
            version: 1
        };
        await this.context.globalState.update('codeActivityData', data);
    }

    private setupListeners(): void {
        vscode.window.onDidChangeActiveTextEditor(
            (editor) => this.onEditorChange(editor),
            null,
            this.context.subscriptions
        );

        vscode.workspace.onDidOpenTextDocument(
            (doc) => this.onDocumentOpen(doc),
            null,
            this.context.subscriptions
        );

        if (vscode.window.activeTextEditor) {
            this.onEditorChange(vscode.window.activeTextEditor);
        }
    }

    private onEditorChange(editor: vscode.TextEditor | undefined): void {
        this.flushCurrentSession();

        if (editor && editor.document.uri.scheme === 'file') {
            const languageId = editor.document.languageId;
            this.session.currentLanguage = languageId;
            this.session.sessionStart = Date.now();

            if (!this.stats[languageId]) {
                this.stats[languageId] = {
                    totalTime: 0,
                    lastActive: Date.now(),
                    fileCount: 0
                };
            }
            this.stats[languageId].lastActive = Date.now();
        } else {
            this.session.currentLanguage = null;
        }

        this.updateStatusBar();
    }

    private onDocumentOpen(doc: vscode.TextDocument): void {
        if (doc.uri.scheme !== 'file') return;
        
        const languageId = doc.languageId;
        if (!this.stats[languageId]) {
            this.stats[languageId] = {
                totalTime: 0,
                lastActive: Date.now(),
                fileCount: 0
            };
        }
        this.stats[languageId].fileCount++;
    }

    private flushCurrentSession(): void {
        if (this.session.currentLanguage && this.session.sessionStart > 0) {
            const elapsed = Math.floor((Date.now() - this.session.sessionStart) / 1000);
            const lang = this.session.currentLanguage;
            
            if (elapsed > 0 && this.stats[lang]) {
                this.stats[lang].totalTime += elapsed;
                
                const today = new Date().toISOString().split('T')[0];
                if (!this.dailyStats[today]) {
                    this.dailyStats[today] = {};
                }
                if (!this.dailyStats[today][lang]) {
                    this.dailyStats[today][lang] = 0;
                }
                this.dailyStats[today][lang] += elapsed;
                
                const hour = new Date().getHours();
                this.hourlyStats[hour] += elapsed;
                
                this.session.sessionSeconds += elapsed;
            }
            this.session.sessionStart = Date.now();
        }
    }

    private tick(): void {
        if (this.session.currentLanguage && this.session.sessionStart > 0) {
            const elapsed = Math.floor((Date.now() - this.session.sessionStart) / 1000);
            if (elapsed > 0 && elapsed % 10 === 0) {
                this.flushCurrentSession();
            }
        }
        this.updateStatusBar();
    }

    private updateStatusBar(): void {
        const currentLang = this.session.currentLanguage;
        const sessionTime = this.formatTime(this.session.sessionSeconds);

        if (currentLang) {
            const langDisplay = this.formatLanguageName(currentLang);
            this.statusBarItem.text = `$(pulse) ${langDisplay} · ${sessionTime}`;
        } else {
            this.statusBarItem.text = `$(pulse) ${sessionTime}`;
        }
    }

    private formatLanguageName(lang: string): string {
        const nameMap: { [key: string]: string } = {
            typescript: 'TypeScript',
            javascript: 'JavaScript',
            python: 'Python',
            java: 'Java',
            go: 'Go',
            rust: 'Rust',
            cpp: 'C++',
            c: 'C',
            csharp: 'C#',
            php: 'PHP',
            ruby: 'Ruby',
            swift: 'Swift',
            kotlin: 'Kotlin',
            html: 'HTML',
            css: 'CSS',
            scss: 'SCSS',
            json: 'JSON',
            markdown: 'Markdown',
            yaml: 'YAML',
            sql: 'SQL',
            shellscript: 'Shell',
            powershell: 'PowerShell',
            dockerfile: 'Docker',
            vue: 'Vue',
            javascriptreact: 'React',
            typescriptreact: 'React TSX',
            svelte: 'Svelte',
        };
        return nameMap[lang] || lang.charAt(0).toUpperCase() + lang.slice(1);
    }

    private getTopLanguage(): string | null {
        let topLang: string | null = null;
        let maxTime = 0;

        for (const [lang, data] of Object.entries(this.stats)) {
            if (data.totalTime > maxTime) {
                maxTime = data.totalTime;
                topLang = lang;
            }
        }

        return topLang;
    }

    private formatTime(seconds: number): string {
        if (seconds < 60) {
            return `${seconds}s`;
        } else if (seconds < 3600) {
            const mins = Math.floor(seconds / 60);
            const secs = seconds % 60;
            return secs > 0 ? `${mins}m ${secs}s` : `${mins}m`;
        } else {
            const hours = Math.floor(seconds / 3600);
            const mins = Math.floor((seconds % 3600) / 60);
            return mins > 0 ? `${hours}h ${mins}m` : `${hours}h`;
        }
    }

    private formatHours(seconds: number): string {
        const hours = seconds / 3600;
        return hours.toFixed(1);
    }

    private getWeeklyData(): { day: string; hours: number; date: string }[] {
        const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
        const result: { day: string; hours: number; date: string }[] = [];
        
        for (let i = 6; i >= 0; i--) {
            const date = new Date();
            date.setDate(date.getDate() - i);
            const dateStr = date.toISOString().split('T')[0];
            const dayData = this.dailyStats[dateStr] || {};
            const totalSeconds = Object.values(dayData).reduce((sum, s) => sum + s, 0);
            
            result.push({
                day: days[date.getDay()],
                hours: totalSeconds / 3600,
                date: dateStr
            });
        }
        
        return result;
    }

    private getPeakHoursData(): { hour: string; activity: number; period: string }[] {
        const result: { hour: string; activity: number; period: string }[] = [];
        
        for (let h = 6; h <= 23; h++) {
            const hour12 = h > 12 ? h - 12 : h === 0 ? 12 : h;
            const period = h >= 12 ? 'PM' : 'AM';
            result.push({
                hour: `${hour12}`,
                activity: this.hourlyStats[h] || 0,
                period
            });
        }
        for (let h = 0; h <= 5; h++) {
            const hour12 = h === 0 ? 12 : h;
            result.push({
                hour: `${hour12}`,
                activity: this.hourlyStats[h] || 0,
                period: 'AM'
            });
        }
        
        return result.slice(0, 16);
    }

    public getStatsHtml(): string {
        const sortedStats = Object.entries(this.stats)
            .sort(([, a], [, b]) => b.totalTime - a.totalTime);

        const totalTime = sortedStats.reduce((sum, [, data]) => sum + data.totalTime, 0);
        const totalFiles = sortedStats.reduce((sum, [, data]) => sum + data.fileCount, 0);
        const topLanguage = this.getTopLanguage();
        const weeklyData = this.getWeeklyData();
        const peakHoursData = this.getPeakHoursData();
        const maxPeakActivity = Math.max(...peakHoursData.map(d => d.activity), 1);
        const maxWeeklyHours = Math.max(...weeklyData.map(d => d.hours), 1);
        const maxLangTime = sortedStats.length > 0 ? sortedStats[0][1].totalTime : 1;

        const focusData = [
            { name: 'Active Coding', value: 68, color: '#27CE98' },
            { name: 'File Navigation', value: 22, color: '#2C2C30' },
            { name: 'Other', value: 10, color: '#404048' },
        ];

        let languageRows = '';
        sortedStats.slice(0, 8).forEach(([lang, data], index) => {
            const percentage = totalTime > 0 ? ((data.totalTime / totalTime) * 100).toFixed(0) : '0';
            const barWidth = (data.totalTime / maxLangTime) * 100;
            const color = index === 0 ? '#27CE98' : (LANGUAGE_COLORS[lang] || '#2C2C30');
            const glow = index === 0 ? 'box-shadow: 0 0 10px rgba(39, 206, 152, 0.3);' : '';
            
            languageRows += `
                <div class="lang-row">
                    <div class="lang-header">
                        <span class="lang-name">${this.escapeHtml(this.formatLanguageName(lang))}</span>
                        <div class="lang-meta">
                            <span class="lang-hours">${this.formatHours(data.totalTime)}h</span>
                            <span class="lang-percent">${percentage}%</span>
                        </div>
                    </div>
                    <div class="lang-bar-bg">
                        <div class="lang-bar" style="width: ${barWidth}%; background-color: ${color}; ${glow}"></div>
                    </div>
                </div>
            `;
        });

        let weeklyBars = '';
        weeklyData.forEach((day) => {
            const heightPercent = maxWeeklyHours > 0 ? (day.hours / maxWeeklyHours) * 100 : 0;
            const isToday = day.date === new Date().toISOString().split('T')[0];
            const color = isToday ? '#27CE98' : '#2C2C30';
            const glow = isToday ? 'box-shadow: 0 0 8px rgba(39, 206, 152, 0.3);' : '';
            
            weeklyBars += `
                <div class="weekly-bar-container">
                    <div class="weekly-bar-wrapper">
                        <div class="weekly-bar" style="height: ${Math.max(heightPercent, 5)}%; background-color: ${color}; ${glow}"></div>
                    </div>
                    <span class="weekly-label">${day.day}</span>
                </div>
            `;
        });

        let peakBars = '';
        peakHoursData.forEach((hour) => {
            const heightPercent = maxPeakActivity > 0 ? (hour.activity / maxPeakActivity) * 100 : 0;
            const isHighActivity = hour.activity >= maxPeakActivity * 0.7;
            const color = isHighActivity ? '#27CE98' : '#2C2C30';
            const glow = isHighActivity ? 'box-shadow: 0 0 8px rgba(39, 206, 152, 0.3);' : '';
            
            peakBars += `
                <div class="peak-bar-container">
                    <div class="peak-bar-wrapper">
                        <div class="peak-bar" style="height: ${Math.max(heightPercent, 5)}%; background-color: ${color}; ${glow}"></div>
                    </div>
                    <span class="peak-label">${hour.hour}</span>
                </div>
            `;
        });

        return `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>DevPulse</title>
    <style>
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, sans-serif;
            padding: 24px;
            color: #fff;
            background-color: #0D0D12;
            min-height: 100vh;
        }
        .container { max-width: 800px; margin: 0 auto; }
        .header {
            display: flex;
            align-items: center;
            justify-content: space-between;
            padding-bottom: 16px;
            border-bottom: 1px solid #2C2C30;
            margin-bottom: 24px;
        }
        .header-title { font-size: 24px; font-weight: 700; color: #fff; margin-bottom: 4px; }
        .header-subtitle { font-size: 14px; color: #6B7280; }
        .session-indicator { display: flex; align-items: center; gap: 8px; font-size: 14px; color: #9CA3AF; }
        .pulse-dot {
            width: 8px; height: 8px; border-radius: 50%; background-color: #27CE98;
            animation: pulse 2s infinite;
        }
        @keyframes pulse { 0%, 100% { opacity: 1; } 50% { opacity: 0.5; } }
        .stats-grid { display: grid; grid-template-columns: repeat(4, 1fr); gap: 16px; margin-bottom: 24px; }
        .stat-card {
            background: #141318; border-radius: 12px; padding: 16px; border: 1px solid #2C2C30;
            transition: all 0.3s ease;
        }
        .stat-card:hover { border-color: rgba(39, 206, 152, 0.3); box-shadow: 0 0 15px rgba(39, 206, 152, 0.1); }
        .stat-header { display: flex; align-items: flex-start; justify-content: space-between; margin-bottom: 12px; }
        .stat-label { font-size: 11px; color: #6B7280; text-transform: uppercase; letter-spacing: 0.5px; }
        .stat-icon { color: #6B7280; }
        .stat-value { font-size: 28px; font-weight: 700; color: #fff; }
        .card {
            background: #141318; border-radius: 12px; padding: 20px; border: 1px solid #2C2C30;
            transition: all 0.3s ease; margin-bottom: 16px;
        }
        .card:hover { border-color: rgba(39, 206, 152, 0.2); }
        .card-title { font-size: 14px; font-weight: 500; color: #fff; margin-bottom: 4px; letter-spacing: 0.3px; }
        .card-subtitle { font-size: 12px; color: #6B7280; margin-bottom: 16px; }
        .lang-row { margin-bottom: 12px; }
        .lang-row:last-child { margin-bottom: 0; }
        .lang-header { display: flex; align-items: center; justify-content: space-between; margin-bottom: 6px; }
        .lang-name { font-size: 14px; color: #9CA3AF; transition: color 0.2s; }
        .lang-row:hover .lang-name { color: #fff; }
        .lang-meta { display: flex; align-items: center; gap: 12px; }
        .lang-hours { font-size: 12px; color: #6B7280; }
        .lang-percent { font-size: 12px; color: #27CE98; font-weight: 500; width: 40px; text-align: right; }
        .lang-bar-bg { height: 8px; background: #2C2C30; border-radius: 4px; overflow: hidden; }
        .lang-bar { height: 100%; border-radius: 4px; transition: width 0.5s ease-out; }
        .grid-2 { display: grid; grid-template-columns: repeat(2, 1fr); gap: 16px; margin-bottom: 16px; }
        .weekly-chart { display: flex; align-items: flex-end; justify-content: space-between; height: 120px; gap: 8px; }
        .weekly-bar-container { flex: 1; display: flex; flex-direction: column; align-items: center; height: 100%; }
        .weekly-bar-wrapper { flex: 1; width: 100%; display: flex; align-items: flex-end; }
        .weekly-bar { width: 100%; border-radius: 4px 4px 0 0; transition: all 0.3s ease; min-height: 4px; }
        .weekly-label { font-size: 11px; color: #6B7280; margin-top: 8px; }
        .focus-container { display: flex; align-items: center; gap: 24px; }
        .focus-chart { position: relative; width: 100px; height: 100px; }
        .focus-legend { flex: 1; }
        .focus-item { display: flex; align-items: center; justify-content: space-between; margin-bottom: 8px; }
        .focus-item:last-child { margin-bottom: 0; }
        .focus-item-left { display: flex; align-items: center; gap: 8px; }
        .focus-dot { width: 8px; height: 8px; border-radius: 50%; }
        .focus-name { font-size: 12px; color: #9CA3AF; }
        .focus-value { font-size: 12px; color: #6B7280; }
        .donut-chart { transform: rotate(-90deg); }
        .peak-chart { display: flex; align-items: flex-end; justify-content: space-between; height: 64px; gap: 4px; }
        .peak-bar-container { flex: 1; display: flex; flex-direction: column; align-items: center; height: 100%; }
        .peak-bar-wrapper { flex: 1; width: 100%; display: flex; align-items: flex-end; }
        .peak-bar { width: 100%; border-radius: 2px 2px 0 0; transition: all 0.3s ease; min-height: 2px; }
        .peak-label { font-size: 10px; color: #6B7280; margin-top: 8px; }
        .empty-state { text-align: center; padding: 48px 24px; color: #6B7280; }
        .empty-icon { font-size: 48px; margin-bottom: 16px; }
        .empty-title { font-size: 18px; color: #9CA3AF; margin-bottom: 8px; }
        @media (max-width: 600px) {
            .stats-grid { grid-template-columns: repeat(2, 1fr); }
            .grid-2 { grid-template-columns: 1fr; }
        }
    </style>
</head>
<body>
    <div class="container">
        <header class="header">
            <div>
                <h1 class="header-title">DevPulse</h1>
                <p class="header-subtitle">Your Coding Activity Insights</p>
            </div>
            <div class="session-indicator">
                <div class="pulse-dot"></div>
                <span>Session: ${this.formatTime(this.session.sessionSeconds)}</span>
            </div>
        </header>

        ${sortedStats.length > 0 ? `
            <div class="stats-grid">
                <div class="stat-card">
                    <div class="stat-header">
                        <span class="stat-label">Total Time</span>
                        <svg class="stat-icon" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                            <circle cx="12" cy="12" r="10"></circle><polyline points="12 6 12 12 16 14"></polyline>
                        </svg>
                    </div>
                    <div class="stat-value">${this.formatHours(totalTime)}h</div>
                </div>
                <div class="stat-card">
                    <div class="stat-header">
                        <span class="stat-label">Most Used</span>
                        <svg class="stat-icon" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                            <polyline points="16 18 22 12 16 6"></polyline><polyline points="8 6 2 12 8 18"></polyline>
                        </svg>
                    </div>
                    <div class="stat-value">${topLanguage ? this.formatLanguageName(topLanguage) : '-'}</div>
                </div>
                <div class="stat-card">
                    <div class="stat-header">
                        <span class="stat-label">Files Edited</span>
                        <svg class="stat-icon" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                            <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path>
                            <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path>
                        </svg>
                    </div>
                    <div class="stat-value">${totalFiles}</div>
                </div>
                <div class="stat-card">
                    <div class="stat-header">
                        <span class="stat-label">Languages</span>
                        <svg class="stat-icon" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                            <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"></polygon>
                        </svg>
                    </div>
                    <div class="stat-value">${sortedStats.length}</div>
                </div>
            </div>

            <div class="card">
                <h3 class="card-title">Language Usage Breakdown</h3>
                <p class="card-subtitle">Time spent per language</p>
                ${languageRows}
            </div>

            <div class="grid-2">
                <div class="card">
                    <h3 class="card-title">Weekly Activity</h3>
                    <p class="card-subtitle">Hours per day</p>
                    <div class="weekly-chart">${weeklyBars}</div>
                </div>
                <div class="card">
                    <h3 class="card-title">Focus Distribution</h3>
                    <p class="card-subtitle">Time allocation</p>
                    <div class="focus-container">
                        <div class="focus-chart">
                            <svg viewBox="0 0 36 36" class="donut-chart">
                                <circle cx="18" cy="18" r="14" fill="none" stroke="#404048" stroke-width="4" stroke-dasharray="10 90" stroke-dashoffset="0"></circle>
                                <circle cx="18" cy="18" r="14" fill="none" stroke="#2C2C30" stroke-width="4" stroke-dasharray="22 78" stroke-dashoffset="-10"></circle>
                                <circle cx="18" cy="18" r="14" fill="none" stroke="#27CE98" stroke-width="4" stroke-dasharray="68 32" stroke-dashoffset="-32"></circle>
                            </svg>
                        </div>
                        <div class="focus-legend">
                            ${focusData.map(item => `
                                <div class="focus-item">
                                    <div class="focus-item-left">
                                        <div class="focus-dot" style="background-color: ${item.color}"></div>
                                        <span class="focus-name">${item.name}</span>
                                    </div>
                                    <span class="focus-value">${item.value}%</span>
                                </div>
                            `).join('')}
                        </div>
                    </div>
                </div>
            </div>

            <div class="card">
                <h3 class="card-title">Peak Coding Hours</h3>
                <p class="card-subtitle">Activity distribution throughout the day</p>
                <div class="peak-chart">${peakBars}</div>
            </div>
        ` : `
            <div class="card">
                <div class="empty-state">
                    <h3 class="empty-title">No Activity Yet</h3>
                    <p>Start coding to see your activity insights!</p>
                </div>
            </div>
        `}
    </div>
</body>
</html>`;
    }

    private escapeHtml(text: string): string {
        return text
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;')
            .replace(/'/g, '&#039;');
    }

    public resetStats(): void {
        this.stats = {};
        this.dailyStats = {};
        for (let i = 0; i < 24; i++) {
            this.hourlyStats[i] = 0;
        }
        this.session = { currentLanguage: null, sessionStart: 0, sessionSeconds: 0 };
        this.saveStats();
        this.updateStatusBar();
    }

    public dispose(): void {
        this.flushCurrentSession();
        this.saveStats();
        if (this.updateInterval) {
            clearInterval(this.updateInterval);
        }
        if (this.saveInterval) {
            clearInterval(this.saveInterval);
        }
        this.statusBarItem.dispose();
    }
}

let tracker: CodeActivityTracker | null = null;

export function activate(context: vscode.ExtensionContext) {
    console.log('DevPulse: Code Activity Tracker is now active!');

    tracker = new CodeActivityTracker(context);
    context.subscriptions.push({ dispose: () => tracker?.dispose() });

    const showStatsCommand = vscode.commands.registerCommand('codeActivity.showStats', () => {
        if (!tracker) return;

        const panel = vscode.window.createWebviewPanel(
            'codeActivityStats',
            'DevPulse - Code Activity',
            vscode.ViewColumn.One,
            { enableScripts: false }
        );

        panel.webview.html = tracker.getStatsHtml();
    });

    const resetCommand = vscode.commands.registerCommand('codeActivity.resetStats', async () => {
        const answer = await vscode.window.showWarningMessage(
            'Are you sure you want to reset all statistics? This cannot be undone.',
            'Reset', 'Cancel'
        );
        
        if (answer === 'Reset' && tracker) {
            tracker.resetStats();
            vscode.window.showInformationMessage('All statistics have been reset.');
        }
    });

    context.subscriptions.push(showStatsCommand, resetCommand);
}

export function deactivate() {
    if (tracker) {
        tracker.dispose();
        tracker = null;
    }
}
