import { Injectable, ElementRef } from '@angular/core';
import * as d3 from 'd3';

@Injectable({
  providedIn: 'root'
})
export class ChartService {
  constructor() {}

  /**
   * Create a donut chart using D3.js
   * @param element The HTML element to render the chart in
   * @param data The data for the chart
   * @param colorScale 
   */
  createDonutChart(
    element: ElementRef,
    data: { label: string; value: number }[],
    colorScale?: string[],
    onSliceClick?: (label: string) => void
  ): void {
    // Clear any existing chart
    d3.select(element.nativeElement).selectAll('*').remove();

    const width = 600;
    const height = 300;
    const margin = 40;
    const radius = Math.min(width, height) / 2 - margin;

    // Create SVG element
    const svg = d3
      .select(element.nativeElement)
      .append('svg')
      .attr('width', width)
      .attr('height', height)
      .append('g')
      .attr('transform', `translate(${width / 2}, ${height / 2})`);

    // Set color scale
    const color = colorScale
      ? d3.scaleOrdinal().domain(data.map(d => d.label)).range(colorScale)
      : d3.scaleOrdinal(d3.schemeCategory10);

    // Compute the position of each group on the pie
    const pie = d3.pie<any>().value((d: any) => d.value);
    const data_ready = pie(data);

    // Build the pie chart
    svg
      .selectAll('path')
      .data(data_ready)
      .enter()
      .append('path')
      .attr('d', d3.arc<any>()
        .innerRadius(radius * 0.5) // This creates the donut hole
        .outerRadius(radius)
      )
      .attr('fill', (d: any) => color(d.data.label) as string)
      .attr('stroke', 'white')
      .style('stroke-width', '2px')
      .style('opacity', 0.7)
      .style('cursor', onSliceClick ? 'pointer' : 'default')
      .on('click', function(event, d: any) {
        if (onSliceClick) {
          onSliceClick(d.data.label);
        }
      })
      .on('mouseover', function(event, d: any) {
        d3.select(this)
          .transition()
          .duration(200)
          .style('opacity', 1)
          .attr('stroke-width', '3px')
          .attr('stroke', '#fff')
          .attr('transform', 'scale(1.05)');
      })
      .on('mouseout', function(event, d: any) {
        d3.select(this)
          .transition()
          .duration(200)
          .style('opacity', 0.7)
          .attr('stroke-width', '2px')
          .attr('stroke', 'white')
          .attr('transform', 'scale(1)');
      })
      // Add entrance animation
      .style('opacity', 0)
      .transition()
      .duration(1000)
      .delay((d, i) => i * 150)
      .style('opacity', 0.7);

    // Add labels with much better positioning to avoid overlapping
    const minAngle = 0.25; // Minimum angle (in radians) to show label (about 14 degrees)
    svg
      .selectAll('text')
      .data(data_ready)
      .enter()
      .append('text')
      .text((d: any) => {
        // Only show label if value > 0 and angle is large enough
        const angle = d.endAngle - d.startAngle;
        return d.data.value > 0 && angle > minAngle ? d.data.label : '';
      })
      .attr('transform', (d: any) => {
        const pos = d3.arc<any>()
          .innerRadius(radius * 1.1)
          .outerRadius(radius * 1.1)
          .centroid(d);
        return `translate(${pos[0]}, ${pos[1]})`;
      })
      .style('text-anchor', (d: any) => {
        const centroid = d3.arc<any>()
          .innerRadius(radius * 1.1)
          .outerRadius(radius * 1.1)
          .centroid(d);
        return centroid[0] > 0 ? 'start' : 'end';
      })
      .style('font-size', '11px')
      .style('font-weight', 'bold')
      .style('fill', '#333')
      .style('pointer-events', 'none')
      // Add entrance animation for labels
      .style('opacity', 0)
      .transition()
      .duration(800)
      .delay((d, i) => i * 200 + 500)
      .style('opacity', 1);

    // Remove legend rendering for donut chart
    // (No legend code here)
  }

  /**
   * Create a bar chart using D3.js
   * @param element The HTML element to render the chart in
   * @param data The data for the chart
   * @param colorScale Optional color scale
   */
  createBarChart(
    element: ElementRef,
    data: { label: string; value: number }[],
    colorScale?: string[],
    onBarClick?: (label: string) => void
  ): void {
    // Clear any existing chart
    d3.select(element.nativeElement).selectAll('*').remove();

    const width = 400;
    const height = 300;
    const margin = { top: 20, right: 30, bottom: 40, left: 40 };
    const innerWidth = width - margin.left - margin.right;
    const innerHeight = height - margin.top - margin.bottom;

    // Create SVG element
    const svg = d3
      .select(element.nativeElement)
      .append('svg')
      .attr('width', width)
      .attr('height', height);

    // Create chart group
    const g = svg
      .append('g')
      .attr('transform', `translate(${margin.left}, ${margin.top})`);

    // Set scales
    const x = d3
      .scaleBand()
      .domain(data.map(d => d.label))
      .range([0, innerWidth])
      .padding(0.1);

    const y = d3
      .scaleLinear()
      .domain([0, d3.max(data, d => d.value) || 0])
      .nice()
      .range([innerHeight, 0]);

    // Set color scale
    const color = colorScale
      ? d3.scaleOrdinal().domain(data.map(d => d.label)).range(colorScale)
      : d3.scaleOrdinal(d3.schemeCategory10);

    // Add bars with click handler
    g.selectAll('rect')
      .data(data)
      .enter()
      .append('rect')
      .attr('x', d => x(d.label) || 0)
      .attr('y', innerHeight) // Start from bottom for animation
      .attr('width', x.bandwidth())
      .attr('height', 0) // Start with height 0
      .attr('fill', d => color(d.label) as string)
      .style('cursor', onBarClick ? 'pointer' : 'default')
      .on('click', function(event, d) {
        if (onBarClick) {
          onBarClick(d.label);
        }
      })
      .on('mouseover', function(event, d) {
        d3.select(this)
          .transition()
          .duration(200)
          .attr('opacity', 0.8)
          .attr('stroke', '#333')
          .attr('stroke-width', '2px');
      })
      .on('mouseout', function(event, d) {
        d3.select(this)
          .transition()
          .duration(200)
          .attr('opacity', 1)
          .attr('stroke', 'none');
      })
      // Add entrance animation
      .transition()
      .duration(1000)
      .delay((d, i) => i * 150)
      .attr('y', d => y(d.value))
      .attr('height', d => innerHeight - y(d.value));

    // Add x-axis
    g.append('g')
      .attr('transform', `translate(0, ${innerHeight})`)
      .call(d3.axisBottom(x))
      .selectAll('text')
      .style('text-anchor', 'middle')
      .style('font-size', '10px');

    // Add y-axis
    g.append('g').call(d3.axisLeft(y));

  }

  /**
   * Create a stacked bar chart using D3.js
   * @param element The HTML element to render the chart in
   * @param data The data for the chart
   * @param keys The keys for stacking
   * @param colorScale Optional color scale
   * @param onBarClick Optional callback for bar click
   */
  createStackedBarChart(
    element: ElementRef,
    data: any[],
    keys: string[],
    colorScale?: string[],
    onBarClick?: (label: string) => void
  ): void {
    // Clear any existing chart
    d3.select(element.nativeElement).selectAll('*').remove();

    const width = 700;
    const height = 300;
    const margin = { top: 20, right: 150, bottom: 40, left: 40 }; // Reduced right margin for legend
    const innerWidth = width - margin.left - margin.right;
    const innerHeight = height - margin.top - margin.bottom;

    // Create SVG element
    const svg = d3
      .select(element.nativeElement)
      .append('svg')
      .attr('width', width)
      .attr('height', height);

    // Create chart group
    const g = svg
      .append('g')
      .attr('transform', `translate(${margin.left}, ${margin.top})`);

    // Stack the data
    const stack = d3.stack().keys(keys);
    const stackedData = stack(data);

    // Set scales
    const x = d3
      .scaleBand()
      .domain(data.map(d => d.category))
      .range([0, innerWidth])
      .padding(0.1);

    const y = d3
      .scaleLinear()
      .domain([0, d3.max(stackedData[stackedData.length - 1], d => d[1]) || 0])
      .nice()
      .range([innerHeight, 0]);

    // Set color scale
    const color = colorScale
      ? d3.scaleOrdinal().domain(keys).range(colorScale)
      : d3.scaleOrdinal(d3.schemeCategory10);

    // Add bars with click handler
    g.selectAll('g')
      .data(stackedData)
      .enter()
      .append('g')
      .attr('fill', (d, i) => color(keys[i]) as string)
      .selectAll('rect')
      .data(d => d)
      .enter()
      .append('rect')
      .attr('x', d => x(String(d.data['category'])) || 0)
      .attr('y', innerHeight) // Start from bottom for animation
      .attr('height', 0) // Start with height 0
      .attr('width', x.bandwidth())
      .style('cursor', onBarClick ? 'pointer' : 'default')
      .on('click', function(event, d) {
        if (onBarClick) {
          onBarClick(String(d.data['category']));
        }
      })
      .on('mouseover', function(event, d) {
        d3.select(this)
          .transition()
          .duration(200)
          .attr('opacity', 0.8)
          .attr('stroke', '#333')
          .attr('stroke-width', '1px');
      })
      .on('mouseout', function(event, d) {
        d3.select(this)
          .transition()
          .duration(200)
          .attr('opacity', 1)
          .attr('stroke', 'none');
      })
      // Add entrance animation
      .transition()
      .duration(1000)
      .delay((d, i) => i * 100)
      .attr('y', d => y(d[1]))
      .attr('height', d => y(d[0]) - y(d[1]));

    // Add x-axis
    g.append('g')
      .attr('transform', `translate(0, ${innerHeight})`)
      .call(d3.axisBottom(x))
      .selectAll('text')
      .style('text-anchor', 'middle')
      .style('font-size', '10px');

    // Add y-axis
    g.append('g').call(d3.axisLeft(y));

    // Add legend
    const legendX = width - margin.right + 20; // Place legend at the start of the right margin
    const legendY = height / 2 - (keys.length * 20) / 2;
    const legend = svg
      .selectAll('.legend')
      .data(keys)
      .enter()
      .append('g')
      .attr('class', 'legend')
      .attr('transform', (d, i) => `translate(${legendX}, ${legendY + i * 28})`);

    legend
      .append('rect')
      .attr('width', 18)
      .attr('height', 18)
      .attr('fill', d => color(d) as string)
      // Add entrance animation for legend rectangles
      .style('opacity', 0)
      .transition()
      .duration(600)
      .delay((d, i) => i * 200 + 1200)
      .style('opacity', 1);

    legend
      .append('text')
      .attr('x', 26)
      .attr('y', 14)
      .style('font-size', '16px')
      .text(d => d)
      // Add entrance animation for legend text
      .style('opacity', 0)
      .transition()
      .duration(600)
      .delay((d, i) => i * 200 + 1400)
      .style('opacity', 1);
  }
}