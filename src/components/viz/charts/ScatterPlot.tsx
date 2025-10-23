import React, { useState, useCallback, useEffect, useMemo } from 'react';
import * as d3 from 'd3';
import {
  regressionLinear,
  regressionQuad,
  regressionExp,
  regressionLog,
} from 'd3-regression';
import Select from '../../layout/Select';
import SearchableSelect from '../../layout/SearchableSelect';
import { useResponsiveChart } from '../../../hooks/useResponsiveChart';
import Input from '../../layout/Input';
import useChartOption from '../../../hooks/useChartOption';
import useDataStore from '../../../store/useDataStore';

interface ScatterPlotProps {
  dataset: GameData;
  chartId: string;
}

const RegressionLineType = {
  none: 'none',
  linear: 'linear',
  quadratic: 'quadratic',
  exponential: 'exponential',
  logarithmic: 'logarithmic',
} as const;

export const ScatterPlot: React.FC<ScatterPlotProps> = ({
  dataset,
  chartId,
}) => {
  const [xFeature, setXFeature] = useChartOption<string>(
    chartId,
    'xFeature',
    '',
  );

  const [xRangeFilter, setXRangeFilter] = useChartOption(
    chartId,
    'xRangeFilter',
    { min: -Infinity, max: Infinity },
  );
  const [yFeature, setYFeature] = useChartOption<string>(
    chartId,
    'yFeature',
    '',
  );

  const [yRangeFilter, setYRangeFilter] = useChartOption(
    chartId,
    'yRangeFilter',
    { min: -Infinity, max: Infinity },
  );

  const [regressionLine, setRegressionLine] = useChartOption<
    keyof typeof RegressionLineType
  >(chartId, 'regressionLine', RegressionLineType.none);
  const { getFilteredDataset } = useDataStore();

  // Get filtered dataset from centralized store
  const filteredDataset = getFilteredDataset(dataset.id);
  const data = filteredDataset?.data || [];

  const getFeatureOptions = () => {
    return Object.fromEntries(
      Object.entries(dataset.columnTypes)
        .filter(([_, value]) => value === 'Numeric')
        .map(([key]) => [key, key]),
    );
  };

  const renderChart = useCallback(
    (
      svg: d3.Selection<SVGSVGElement, unknown, null, undefined>,
      dimensions: { width: number; height: number },
    ) => {
      if (!xFeature || !yFeature || !data.length) return;

      const margin = { top: 20, right: 20, bottom: 60, left: 60 };
      const width = dimensions.width - margin.left - margin.right;
      const height = dimensions.height - margin.top - margin.bottom;

      const chartGroup = svg
        .append('g')
        .attr('transform', `translate(${margin.left},${margin.top})`);

      const safeMin =
        typeof xRangeFilter.min === 'number' ? xRangeFilter.min : -Infinity;
      const safeMax =
        typeof xRangeFilter.max === 'number' ? xRangeFilter.max : Infinity;
      const safeMinY =
        typeof yRangeFilter.min === 'number' ? yRangeFilter.min : -Infinity;
      const safeMaxY =
        typeof yRangeFilter.max === 'number' ? yRangeFilter.max : Infinity;

      const dots = data.filter((d) => {
        const xValue = (d as Record<string, any>)[xFeature];
        const yValue = (d as Record<string, any>)[yFeature];
        return (
          xValue >= safeMin &&
          xValue <= safeMax &&
          yValue >= safeMinY &&
          yValue <= safeMaxY
        );
      });

      if (dots.length === 0) return;

      // Create scales
      const xScale = d3
        .scaleLinear()
        .domain(
          d3.extent(dots.map((d) => (d as Record<string, any>)[xFeature])) as [
            number,
            number,
          ],
        )
        .range([0, width])
        .nice();

      const yScale = d3
        .scaleLinear()
        .domain(
          d3.extent(dots.map((d) => (d as Record<string, any>)[yFeature])) as [
            number,
            number,
          ],
        )
        .range([height, 0])
        .nice();

      // Add dots
      chartGroup
        .selectAll('.dot')
        .data(dots)
        .enter()
        .append('circle')
        .attr('class', 'dot')
        .attr('cx', (d) => xScale((d as Record<string, any>)[xFeature]))
        .attr('cy', (d) => yScale((d as Record<string, any>)[yFeature]))
        .attr('r', 4)
        .attr('fill', '#3b82f6')
        .attr('opacity', 0.7);

      // Add regression line
      if (regressionLine !== RegressionLineType.none) {
        const getRegressionFunction = () => {
          switch (regressionLine) {
            case RegressionLineType.linear:
              return regressionLinear();
            case RegressionLineType.quadratic:
              return regressionQuad();
            case RegressionLineType.exponential:
              return regressionExp();
            case RegressionLineType.logarithmic:
              return regressionLog();
            default:
              return regressionLinear();
          }
        };

        // Filter data for exponential and logarithmic regression
        let regressionData = dots.map((d) => ({
          x: (d as Record<string, any>)[xFeature],
          y: (d as Record<string, any>)[yFeature],
        }));

        // For exponential and logarithmic, filter out non-positive values
        if (
          regressionLine === RegressionLineType.exponential ||
          regressionLine === RegressionLineType.logarithmic
        ) {
          regressionData = regressionData.filter((d) => d.x > 0 && d.y > 0);
        }

        // Only proceed if we have enough valid data points
        if (regressionData.length < 2) {
          return;
        }

        const regression = getRegressionFunction()
          .x((d: any) => d.x)
          .y((d: any) => d.y);

        const result = regression(regressionData);

        if (result && result.length > 0) {
          // Generate line points from regression result
          const linePoints = result.map((point: any) => ({
            x: point[0],
            y: point[1],
          }));

          const line = d3
            .line<{ x: number; y: number }>()
            .x((d) => xScale(d.x))
            .y((d) => yScale(d.y));

          chartGroup
            .append('path')
            .datum(linePoints)
            .attr('class', 'regression-line')
            .attr('d', line)
            .attr('fill', 'none')
            .attr('stroke', '#ef4444')
            .attr('stroke-width', 2)
            .attr('opacity', 0.8);

          // show line equation
          let equation = '';
          switch (regressionLine) {
            case RegressionLineType.linear:
              equation = `y = ${result.a.toFixed(3)}x + ${result.b.toFixed(3)}`;
              break;
            case RegressionLineType.quadratic:
              equation = `y = ${result.a.toFixed(3)}x² + ${result.b.toFixed(3)}x + ${result.c.toFixed(3)}`;
              break;
            case RegressionLineType.exponential:
              equation = `y = ${result.a.toFixed(3)}e^(${result.b.toFixed(3)}x)`;
              break;
            case RegressionLineType.logarithmic:
              equation = `y = ${result.a.toFixed(3)}ln(x) + ${result.b.toFixed(3)}`;
              break;
            default:
              equation = '';
          }
          chartGroup
            .append('text')
            .attr('x', width - 10)
            .attr('y', 20)
            .attr('text-anchor', 'end')
            .attr('font-size', Math.max(10, Math.min(12, height / 35)))
            .attr('fill', '#374151')
            .text(equation);
        }
      }

      // Add X axis
      const xAxis = d3.axisBottom(xScale);
      chartGroup
        .append('g')
        .attr('transform', `translate(0,${height})`)
        .call(xAxis)
        .attr('font-size', Math.max(10, Math.min(12, width / 50)));

      // Add Y axis
      const yAxis = d3.axisLeft(yScale);
      chartGroup
        .append('g')
        .call(yAxis)
        .attr('font-size', Math.max(10, Math.min(12, height / 30)));

      // Add axis labels
      chartGroup
        .append('text')
        .attr('transform', 'rotate(-90)')
        .attr('y', 0 - margin.left)
        .attr('x', 0 - height / 2)
        .attr('dy', '1em')
        .style('text-anchor', 'middle')
        .attr('font-size', Math.max(12, Math.min(14, height / 25)))
        .attr('fill', '#374151')
        .text(yFeature);

      chartGroup
        .append('text')
        .attr(
          'transform',
          `translate(${width / 2}, ${height + margin.bottom - 10})`,
        )
        .style('text-anchor', 'middle')
        .attr('font-size', Math.max(12, Math.min(14, height / 25)))
        .attr('fill', '#374151')
        .text(xFeature);
    },
    [xFeature, yFeature, regressionLine, data, xRangeFilter, yRangeFilter],
  );

  const { svgRef, containerRef } = useResponsiveChart(renderChart);

  return (
    <div className="flex flex-col gap-2 p-2 h-full">
      <div className="flex flex-col gap-2">
        <div className="flex flex-row gap-2">
          <SearchableSelect
            className="flex-3"
            label="X-Axis"
            placeholder="Select feature..."
            value={xFeature}
            onChange={(value) => {
              setXFeature(value);
              setXRangeFilter({
                min: -Infinity,
                max: Infinity,
              });
            }}
            options={getFeatureOptions()}
          />
          <Input
            className="flex-1"
            label="X Min"
            value={
              xRangeFilter.min === -Infinity || xRangeFilter.min == null
                ? ''
                : xRangeFilter.min.toString()
            }
            onChange={(value) =>
              setXRangeFilter({
                ...xRangeFilter,
                min: value === '' ? -Infinity : parseFloat(value),
              })
            }
            debounce
          />
          <Input
            className="flex-1"
            label="X Max"
            value={
              xRangeFilter.max === Infinity || xRangeFilter.max == null
                ? ''
                : xRangeFilter.max.toString()
            }
            onChange={(value) =>
              setXRangeFilter({
                ...xRangeFilter,
                max: value === '' ? Infinity : parseFloat(value),
              })
            }
            debounce
          />
        </div>
        <div className="flex flex-row gap-2">
          <SearchableSelect
            className="flex-3"
            label="Y-Axis"
            placeholder="Select feature..."
            value={yFeature}
            onChange={(value) => {
              setYFeature(value);
              setYRangeFilter({ min: -Infinity, max: Infinity });
            }}
            options={getFeatureOptions()}
          />
          <Input
            className="flex-1"
            label="Y Min"
            value={
              yRangeFilter.min === -Infinity || yRangeFilter.min == null
                ? ''
                : yRangeFilter.min.toString()
            }
            onChange={(value) =>
              setYRangeFilter({
                ...yRangeFilter,
                min: value === '' ? -Infinity : parseFloat(value),
              })
            }
            debounce
          />
          <Input
            className="flex-1"
            label="Y Max"
            value={
              yRangeFilter.max === Infinity || yRangeFilter.max == null
                ? ''
                : yRangeFilter.max.toString()
            }
            onChange={(value) =>
              setYRangeFilter({
                ...yRangeFilter,
                max: value === '' ? Infinity : parseFloat(value),
              })
            }
            debounce
          />
        </div>
        <div className="flex flex-row gap-2">
          <Select
            label="Trend Line"
            value={regressionLine}
            onChange={(value) =>
              setRegressionLine(value as keyof typeof RegressionLineType)
            }
            options={Object.fromEntries(
              Object.entries(RegressionLineType).map(([key, value]) => [
                key,
                value,
              ]),
            )}
          />
        </div>
      </div>

      <div ref={containerRef} className="flex-1 min-h-0">
        <svg
          ref={svgRef}
          className="w-full h-full"
          style={{ minHeight: '200px' }}
        ></svg>
      </div>
    </div>
  );
};
