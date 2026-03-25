// MIDI Analysis Studio - JavaScript

class MIDIAnalysisApp {
    constructor() {
        this.midiFile = null;
        this.analysisResult = null;

        this.initializeElements();
        this.setupEventListeners();
    }

    initializeElements() {
        this.elements = {
            uploadBox: document.getElementById('uploadBox'),
            midiInput: document.getElementById('midiInput'),
            browseBtn: document.getElementById('browseBtn'),
            fileName: document.getElementById('fileName'),
            analyzeBtn: document.getElementById('analyzeBtn'),
            loadingSpinner: document.getElementById('loadingSpinner'),
            resultsSection: document.getElementById('resultsSection'),
            errorSection: document.getElementById('errorSection'),
            errorMessage: document.getElementById('errorMessage'),
            retryBtn: document.getElementById('retryBtn'),
            analyzeAnotherBtn: document.getElementById('analyzeAnotherBtn'),
            copyJsonBtn: document.getElementById('copyJsonBtn'),
            dynamicsBtns: document.getElementById('dynamicsBtns'),
            humanizeBtn: document.getElementById('humanizeBtn'),
            normalizeVelocityBtn: document.getElementById('normalizeVelocityBtn'),
            humanizeModal: document.getElementById('humanizeModal'),
            cancelHumanizeBtn: document.getElementById('cancelHumanizeBtn'),
            humanizeTimingBtn: document.getElementById('humanizeTimingBtn'),
            humanizeTimingModal: document.getElementById('humanizeTimingModal'),
            cancelHumanizeTimingBtn: document.getElementById('cancelHumanizeTimingBtn'),
        };
    }

    setupEventListeners() {
        // File input
        this.elements.browseBtn.addEventListener('click', () => {
            this.elements.midiInput.click();
        });

        this.elements.midiInput.addEventListener('change', (e) => {
            this.handleFileSelect(e.target.files[0]);
        });

        // Drag and drop
        this.elements.uploadBox.addEventListener('dragover', (e) => {
            e.preventDefault();
            this.elements.uploadBox.classList.add('dragover');
        });

        this.elements.uploadBox.addEventListener('dragleave', () => {
            this.elements.uploadBox.classList.remove('dragover');
        });

        this.elements.uploadBox.addEventListener('drop', (e) => {
            e.preventDefault();
            this.elements.uploadBox.classList.remove('dragover');
            const files = e.dataTransfer.files;
            if (files.length > 0) {
                this.handleFileSelect(files[0]);
            }
        });

        // Analyze button
        this.elements.analyzeBtn.addEventListener('click', () => {
            this.analyzeFile();
        });

        // Results buttons
        this.elements.analyzeAnotherBtn.addEventListener('click', () => {
            this.reset();
        });

        this.elements.copyJsonBtn.addEventListener('click', () => {
            this.copyJsonToClipboard();
        });

        // Error retry
        this.elements.retryBtn.addEventListener('click', () => {
            this.reset();
        });

        // Humanize velocity button — open intensity modal
        this.elements.humanizeBtn.addEventListener('click', () => {
            this.elements.humanizeModal.style.display = 'flex';
        });

        // Normalize velocity — no modal, fires directly
        this.elements.normalizeVelocityBtn.addEventListener('click', () => {
            this.normalizeVelocity();
        });

        // Cancel humanize modal
        this.elements.cancelHumanizeBtn.addEventListener('click', () => {
            this.elements.humanizeModal.style.display = 'none';
        });

        // Close modal on backdrop click
        this.elements.humanizeModal.addEventListener('click', (e) => {
            if (e.target === this.elements.humanizeModal) {
                this.elements.humanizeModal.style.display = 'none';
            }
        });

        // Velocity intensity selection
        document.querySelectorAll('.btn-intensity:not(.btn-timing-intensity)').forEach(btn => {
            btn.addEventListener('click', () => {
                const intensity = parseInt(btn.dataset.intensity, 10);
                this.elements.humanizeModal.style.display = 'none';
                this.humanizeFile(intensity);
            });
        });

        // Humanize timing button — open timing intensity modal
        this.elements.humanizeTimingBtn.addEventListener('click', () => {
            this.elements.humanizeTimingModal.style.display = 'flex';
        });

        this.elements.cancelHumanizeTimingBtn.addEventListener('click', () => {
            this.elements.humanizeTimingModal.style.display = 'none';
        });

        this.elements.humanizeTimingModal.addEventListener('click', (e) => {
            if (e.target === this.elements.humanizeTimingModal) {
                this.elements.humanizeTimingModal.style.display = 'none';
            }
        });

        // Timing intensity selection
        document.querySelectorAll('.btn-timing-intensity').forEach(btn => {
            btn.addEventListener('click', () => {
                const intensity = parseInt(btn.dataset.intensity, 10);
                this.elements.humanizeTimingModal.style.display = 'none';
                this.humanizeTimingFile(intensity);
            });
        });
    }

    handleFileSelect(file) {
        if (!file) return;

        // Validate file type
        if (!/\.(mid|midi)$/i.test(file.name)) {
            this.showError('Please select a valid MIDI file (.mid or .midi)');
            return;
        }

        // Validate file size (16MB limit)
        if (file.size > 16 * 1024 * 1024) {
            this.showError('File is too large. Maximum size is 16MB');
            return;
        }

        this.midiFile = file;
        this.elements.fileName.textContent = `📄 ${file.name} (${this.formatFileSize(file.size)})`;
        this.elements.fileName.style.display = 'block';
        this.elements.analyzeBtn.style.display = 'block';
        this.hideError();
    }

    async analyzeFile() {
        if (!this.midiFile) return;

        const formData = new FormData();
        formData.append('midi_file', this.midiFile);

        this.showLoading();

        try {
            const response = await fetch('/api/analyze', {
                method: 'POST',
                body: formData,
            });

            let result;
            try {
                result = await response.json();
            } catch {
                throw new Error('Server returned an unreadable response');
            }

            if (!response.ok || result.error) {
                throw new Error(result.error || 'Analysis failed');
            }
            this.analysisResult = result;
            this.displayResults(result);
            this.hideLoading();

        } catch (error) {
            this.showError(`Analysis error: ${error.message}`);
            this.hideLoading();
        }
    }

    displayResults(result) {
        // Hide upload section, show results
        document.querySelector('.upload-section').style.display = 'none';
        this.elements.resultsSection.style.display = 'block';

        // File Information
        document.getElementById('resFileName').textContent = result.file;
        const meta = result.metadata;
        const duration = this.formatDuration(meta.duration_seconds);
        document.getElementById('resDuration').textContent = duration;
        document.getElementById('resTracks').textContent = meta.track_count;
        document.getElementById('resFormat').textContent = `Type ${meta.format}`;

        // Structure
        const struct = result.structure;
        document.getElementById('resNotes').textContent = struct.total_notes;
        document.getElementById('resPolyphony').textContent = `${struct.max_polyphony} notes`;

        if (struct.note_range) {
            const nr = struct.note_range;
            document.getElementById('resNoteRange').textContent = 
                `${nr.lowest} – ${nr.highest} (${nr.span_semitones} semitones)`;
        } else {
            document.getElementById('resNoteRange').textContent = 'N/A';
        }

        const timeSignatures = struct.time_signatures || [];
        if (timeSignatures.length > 0) {
            document.getElementById('resTimeSignature').textContent = timeSignatures[0].display;
        } else {
            document.getElementById('resTimeSignature').textContent = 'Unknown';
        }

        this.displayInstruments(struct.instruments || []);

        // Key & Mode
        const key = result.key;
        
        if (key.error) {
            document.getElementById('resKey').textContent = 'Error';
            document.getElementById('resMode').textContent = 'N/A';
            document.getElementById('resCorrelation').textContent = 'N/A';
            document.getElementById('resModalFlavor').textContent = 'N/A';
        } else {
            const keyLabel = document.getElementById('resKeyLabel');
            if (key.modulation_path) {
                document.getElementById('resKey').textContent = key.modulation_path;
                keyLabel.textContent = 'Key (modulations)';
            } else {
                document.getElementById('resKey').textContent = key.tonic;
                keyLabel.textContent = 'Key';
            }
            document.getElementById('resMode').textContent = key.mode;
            document.getElementById('resCorrelation').textContent = key.correlation.toFixed(3);
            document.getElementById('resModalFlavor').textContent = key.modal_flavor || 'N/A';
        }

        // Tempo
        const tempo = result.tempo;
        document.getElementById('resInitialBPM').textContent = tempo.initial_bpm;
        document.getElementById('resTempoType').textContent = 
            tempo.is_constant ? 'Constant' : 'Variable';

        if (!tempo.is_constant) {
            document.getElementById('resBPMRange').textContent = 
                `${tempo.min_bpm} – ${tempo.max_bpm}`;
            document.getElementById('resTempoChanges').textContent = 
                tempo.tempo_changes.length;
            this.displayTempoChanges(tempo.tempo_changes || []);
        } else {
            document.getElementById('resBPMRange').textContent = 'N/A';
            document.getElementById('resTempoChanges').textContent = '0';
        }

        // Dynamics
        const dyn = result.dynamics;
        if (dyn.error) {
            document.getElementById('resOverallDynamic').textContent = 'Error';
            document.getElementById('resAvgVelocity').textContent = 'N/A';
            document.getElementById('resVelRange').textContent = 'N/A';
            document.getElementById('resVelStdDev').textContent = 'N/A';
        } else {
            document.getElementById('resOverallDynamic').textContent = dyn.overall_dynamic;
            document.getElementById('resAvgVelocity').textContent = dyn.average_velocity;
            document.getElementById('resVelRange').textContent = 
                `${dyn.min_velocity} – ${dyn.max_velocity}`;
            document.getElementById('resVelStdDev').textContent = dyn.std_deviation.toFixed(2);
            
            // Display humanness score
            if (dyn.humanness_score !== undefined) {
                const score = dyn.humanness_score;
                const display = document.getElementById('resHumanness');
                display.textContent = score + '%';
                
                // Update spectrum bar
                const spectrumContainer = document.getElementById('humanessSpectrumContainer');
                spectrumContainer.style.display = 'block';
                
                const fill = document.getElementById('spectrumFill');
                fill.style.width = score + '%';
                
                // Update label based on score
                let label = '';
                if (score < 20) {
                    label = '🎵 Clearly Human - Natural velocity variation';
                } else if (score < 40) {
                    label = '🎶 Likely Human - Good velocity dynamics';
                } else if (score < 60) {
                    label = '⚙️ Mixed - Some velocity variation';
                } else if (score < 80) {
                    label = '📱 Likely Software - Limited velocity range';
                } else {
                    label = '🤖 Clearly Software - All notes same velocity';
                }
                document.getElementById('humanessLabel').textContent = label;

                // Show dynamics action buttons whenever we have velocity data
                this.elements.dynamicsBtns.style.display = 'flex';
            }
            
            this.displayVelocityChart(dyn);
        }

        // Quantization
        const quant = result.quantization;
        if (quant && !quant.error) {
            const score = quant.quantization_score;
            document.getElementById('resOnGrid').textContent =
                quant.on_grid_percentage.toFixed(1) + '%';
            document.getElementById('resMeanOffset').textContent =
                (quant.mean_offset_fraction * 100).toFixed(1) + '% of 16th';
            document.getElementById('resOffsetStdDev').textContent =
                (quant.std_offset_fraction * 100).toFixed(1) + '% of 16th';
            document.getElementById('resQuantization').textContent = score + '%';

            const spectrumContainer = document.getElementById('quantizationSpectrumContainer');
            spectrumContainer.style.display = 'block';

            document.getElementById('quantizationSpectrumFill').style.width = score + '%';

            let qLabel = '';
            if (score < 20) {
                qLabel = '🎵 Clearly Human - Notes placed freely';
            } else if (score < 40) {
                qLabel = '🎶 Likely Human - Some timing variation';
            } else if (score < 60) {
                qLabel = '⚙️ Mixed - Partially quantized';
            } else if (score < 80) {
                qLabel = '📱 Likely Software - Most notes on grid';
            } else {
                qLabel = '🤖 Clearly Software - All notes snapped to grid';
            }
            document.getElementById('quantizationLabel').textContent = qLabel;
            this.elements.humanizeTimingBtn.style.display = 'inline-block';
        }

        // Raw JSON
        document.getElementById('rawJSON').textContent =
            JSON.stringify(result, null, 2);

        // Scroll to results
        requestAnimationFrame(() => {
            document.querySelector('.results-container').scrollIntoView({ behavior: 'smooth' });
        });
    }

    displayInstruments(instruments) {
        const container = document.getElementById('instrumentsList');
        if (instruments.length === 0) {
            container.innerHTML = '';
            return;
        }

        let html = '<h4>🎸 Instruments</h4>';
        instruments.forEach(inst => {
            html += `
                <div class="instrument-item">
                    <div class="channel">CH ${inst.channel}</div>
                    <div class="name">${inst.name}</div>
                    <div class="notes">${inst.note_count} notes</div>
                </div>
            `;
        });

        container.innerHTML = html;
    }

    displayVelocityChart(dynamics) {
        const dist = dynamics.level_distribution;
        if (!dist || Object.keys(dist).length === 0) return;

        const order = ['ppp', 'pp', 'p', 'mp', 'mf', 'f', 'ff', 'fff'];
        const maxCount = Math.max(...Object.values(dist));

        let html = '';
        order.forEach(level => {
            const count = dist[level] || 0;
            if (count === 0) return;
            const pct = Math.round((count / maxCount) * 100);
            html += `
                <div class="vel-bar-row">
                    <span class="vel-label">${level}</span>
                    <div class="vel-bar-bg">
                        <div class="vel-bar-fill" style="width:${pct}%"></div>
                    </div>
                    <span class="vel-count">${count}</span>
                </div>`;
        });

        document.getElementById('velChart').innerHTML = html;
        document.getElementById('velChartContainer').style.display = 'block';
    }

    displayTempoChanges(tempoChanges) {
        const container = document.getElementById('tempoChangesList');
        if (tempoChanges.length === 0) {
            container.innerHTML = '';
            return;
        }

        let html = '<h4>Tempo Changes</h4>';
        tempoChanges.forEach(change => {
            html += `
                <div class="change-item">
                    <div class="measure">${change.time_seconds.toFixed(2)}s</div>
                    <div class="change-detail">→ ${change.bpm} BPM</div>
                </div>
            `;
        });

        container.innerHTML = html;
    }


    showLoading() {
        this.elements.loadingSpinner.style.display = 'block';
        this.elements.resultsSection.style.display = 'none';
        this.hideError();
    }

    hideLoading() {
        this.elements.loadingSpinner.style.display = 'none';
    }

    showError(message) {
        this.elements.errorSection.style.display = 'block';
        this.elements.errorMessage.textContent = message;
        this.elements.resultsSection.style.display = 'none';
        this.elements.loadingSpinner.style.display = 'none';
    }

    hideError() {
        this.elements.errorSection.style.display = 'none';
    }

    async humanizeTimingFile(intensity) {
        if (!this.midiFile) return;

        const btn = this.elements.humanizeTimingBtn;
        const originalText = btn.textContent;
        btn.textContent = 'Humanizing...';
        btn.disabled = true;

        try {
            const formData = new FormData();
            formData.append('midi_file', this.midiFile);
            formData.append('intensity', intensity);

            const response = await fetch('/api/humanize-timing', {
                method: 'POST',
                body: formData,
            });

            if (!response.ok) {
                let errMsg = 'Timing humanization failed';
                try {
                    const err = await response.json();
                    errMsg = err.error || errMsg;
                } catch { /* ignore */ }
                throw new Error(errMsg);
            }

            const blob = await response.blob();
            const stem = this.midiFile.name.replace(/\.(mid|midi)$/i, '');
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `${stem}-timing-humanized.mid`;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            URL.revokeObjectURL(url);

        } catch (error) {
            alert(`Humanize timing error: ${error.message}`);
        } finally {
            btn.textContent = originalText;
            btn.disabled = false;
        }
    }

    async normalizeVelocity() {
        if (!this.midiFile) return;

        const btn = this.elements.normalizeVelocityBtn;
        const originalText = btn.textContent;
        btn.textContent = 'Normalizing...';
        btn.disabled = true;

        try {
            const formData = new FormData();
            formData.append('midi_file', this.midiFile);

            const response = await fetch('/api/normalize-velocity', {
                method: 'POST',
                body: formData,
            });

            if (!response.ok) {
                let errMsg = 'Normalization failed';
                try {
                    const err = await response.json();
                    errMsg = err.error || errMsg;
                } catch { /* ignore */ }
                throw new Error(errMsg);
            }

            const blob = await response.blob();
            const stem = this.midiFile.name.replace(/\.(mid|midi)$/i, '');
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `${stem}-normalized.mid`;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            URL.revokeObjectURL(url);

        } catch (error) {
            alert(`Normalize error: ${error.message}`);
        } finally {
            btn.textContent = originalText;
            btn.disabled = false;
        }
    }

    async humanizeFile(intensity) {
        if (!this.midiFile) return;

        const btn = this.elements.humanizeBtn;
        const originalText = btn.textContent;
        btn.textContent = 'Humanizing...';
        btn.disabled = true;

        try {
            const formData = new FormData();
            formData.append('midi_file', this.midiFile);
            formData.append('intensity', intensity);

            const response = await fetch('/api/humanize', {
                method: 'POST',
                body: formData,
            });

            if (!response.ok) {
                let errMsg = 'Humanization failed';
                try {
                    const err = await response.json();
                    errMsg = err.error || errMsg;
                } catch { /* ignore */ }
                throw new Error(errMsg);
            }

            // Trigger download
            const blob = await response.blob();
            const stem = this.midiFile.name.replace(/\.(mid|midi)$/i, '');
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `${stem}-humanized.mid`;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            URL.revokeObjectURL(url);

        } catch (error) {
            alert(`Humanize error: ${error.message}`);
        } finally {
            btn.textContent = originalText;
            btn.disabled = false;
        }
    }

    copyJsonToClipboard() {
        const json = document.getElementById('rawJSON').textContent;
        navigator.clipboard.writeText(json).then(() => {
            const btn = this.elements.copyJsonBtn;
            const originalText = btn.textContent;
            btn.textContent = '✓ Copied!';
            setTimeout(() => {
                btn.textContent = originalText;
            }, 2000);
        });
    }

    reset() {
        this.midiFile = null;
        this.analysisResult = null;

        // Reset UI
        document.querySelector('.upload-section').style.display = 'block';
        this.elements.resultsSection.style.display = 'none';
        this.hideError();
        this.hideLoading();

        // Reset file input
        this.elements.midiInput.value = '';
        this.elements.fileName.style.display = 'none';
        this.elements.analyzeBtn.style.display = 'none';

        // Scroll to top
        window.scrollTo({ top: 0, behavior: 'smooth' });
    }

    formatFileSize(bytes) {
        if (bytes === 0) return '0 Bytes';
        const k = 1024;
        const sizes = ['Bytes', 'KB', 'MB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return Math.round(bytes / Math.pow(k, i) * 100) / 100 + ' ' + sizes[i];
    }

    formatDuration(seconds) {
        const hours = Math.floor(seconds / 3600);
        const minutes = Math.floor((seconds % 3600) / 60);
        const secs = Math.floor(seconds % 60);

        if (hours > 0) {
            return `${hours}h ${minutes}m ${secs}s`;
        } else if (minutes > 0) {
            return `${minutes}m ${secs}s`;
        } else {
            return `${secs}s`;
        }
    }
}

// Initialize app when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
    window.app = new MIDIAnalysisApp();
});
