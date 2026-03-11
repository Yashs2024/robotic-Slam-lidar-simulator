export class DynamicsChartManager {
    constructor(canvasId) {
        this.ctx = document.getElementById(canvasId).getContext('2d');

        // Track the last 100 data points (approx 10 seconds at 10fps updates)
        this.maxDataPoints = 100;

        // X-axis labels (just empty strings or relative time)
        this.labels = Array(this.maxDataPoints).fill('');

        // Circular buffer or shift array for data
        this.linearVelData = Array(this.maxDataPoints).fill(0);
        this.angularVelData = Array(this.maxDataPoints).fill(0);

        this.chart = new Chart(this.ctx, {
            type: 'line',
            data: {
                labels: this.labels,
                datasets: [
                    {
                        label: 'Linear Vel (m/s)',
                        data: this.linearVelData,
                        borderColor: '#10b981', // green
                        backgroundColor: 'transparent',
                        borderWidth: 2,
                        tension: 0.3,
                        pointRadius: 0
                    },
                    {
                        label: 'Angular Vel (rad/s)',
                        data: this.angularVelData,
                        borderColor: '#8b5cf6', // purple
                        backgroundColor: 'transparent',
                        borderWidth: 2,
                        tension: 0.3,
                        pointRadius: 0
                    }
                ]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                animation: false, // Turn off animation for high-frequency live data
                interaction: {
                    mode: 'index',
                    intersect: false,
                },
                scales: {
                    x: {
                        display: false // Hide X axis labels to save space and reduce noise
                    },
                    y: {
                        display: true,
                        grid: {
                            color: 'rgba(255, 255, 255, 0.1)'
                        },
                        ticks: {
                            color: 'rgba(255, 255, 255, 0.7)',
                            font: {
                                size: 10
                            }
                        }
                    }
                },
                plugins: {
                    legend: {
                        display: true,
                        labels: {
                            color: 'rgba(255, 255, 255, 0.8)',
                            boxWidth: 12,
                            font: {
                                size: 10
                            }
                        }
                    },
                    tooltip: {
                        enabled: false
                    }
                }
            }
        });

        // Throttle updates so we don't overwhelm the browser CPU
        this.lastUpdateTime = 0;
        this.updateIntervalMs = 100; // 10 FPS
    }

    updateData(robot) {
        const now = performance.now();
        if (now - this.lastUpdateTime < this.updateIntervalMs) {
            return; // Skip update to save CPU
        }
        this.lastUpdateTime = now;

        // Shift arrays and push new values
        this.linearVelData.shift();
        this.angularVelData.shift();

        // Push the new velocities
        this.linearVelData.push(robot.forwardSpeed);
        this.angularVelData.push(robot.turnSpeed);

        // Update chart display
        this.chart.update('none');
    }
}
