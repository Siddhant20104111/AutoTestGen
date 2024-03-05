import { JSDOM } from 'jsdom';
import { ParsedClassType, ParsedMethodType, LineData } from '../types/ParsedClassType';
import { getUrlEnding } from '../utilities/getUrlEnding';
import { Uri, workspace } from 'vscode';
import { readFile, writeFile } from '../utilities/fsUtils';

export class ScrapeCoverage {
    constructor(private readonly vsStorageURL: Uri) {}

    
    async scrapeJacocoCode(jacocoHtmlResultUrl: string): Promise<ParsedMethodType[]> {

        const htmlContent = await readFile(jacocoHtmlResultUrl)
        
        // Parse HTML content using jsdom
        const dom = new JSDOM(htmlContent);
        const document = dom.window.document;
        
        // Find the <pre> tag containing the code
        const codeCover = document.querySelector('pre');
        if (!codeCover) {
            throw new Error('No <pre> tag found');
        }
    
        // ---------- Find the line number of focal method {} start and end. ---------- //
        const className = getUrlEnding(jacocoHtmlResultUrl).replace('.html', '') + '.java' + '.json';
        if(!workspace.workspaceFolders){
            throw new Error('No workspace folder found');
        }

        const filePath: Uri = Uri.joinPath(this.vsStorageURL, 'temp', workspace.workspaceFolders[0].name , 'main' , className);

        const parsedCLSRes = await readFile(filePath)
        const parsedCLS: ParsedClassType = JSON.parse(Buffer.from(parsedCLSRes).toString('utf8'));
        if (!parsedCLS.methods) {
            throw new Error('No methods found');
        }
        const mtd: ParsedMethodType[] = parsedCLS.methods;
    
        for (let i = 0; i < mtd.length - 1; i++) {
            const focalMethodArr: LineData[] = [];
            for (let j = mtd[i].star_line; j <= mtd[i].end_line; j++) {
                const span = codeCover.querySelector(`span#L${j}`);
                const className = span ? span.getAttribute('class') || '' : '';
    
                focalMethodArr.push({
                    line: span ? span.textContent || '' : '',
                    status: className || 'none'
                });
            }
            mtd[i].coverage_lines = focalMethodArr;
            mtd[i].number_of_PC = focalMethodArr.filter(x => x.status === 'nc').length;
            mtd[i].number_of_NC = focalMethodArr.filter(x => x.status === 'pc').length;
        }

        parsedCLS.methods = mtd;

        await writeFile(filePath, JSON.stringify(parsedCLS))    
        return mtd;
    }

    /**
     * Check if a method has a test method
     * @param methodName method name
     * @param parsedFilePathOrContent parsed file path or content
     * @returns boolean
     */
    async checkIfHasTestMethod(methodName: string, parsedFilePathOrContent: string | ParsedMethodType[]): Promise<boolean> {
        let parsedClass: ParsedClassType;
        if (typeof parsedFilePathOrContent === 'string') {
            const parsedContent = await readFile(parsedFilePathOrContent);
            parsedClass = JSON.parse(parsedContent);
        }else {
            parsedClass = {methods: parsedFilePathOrContent};
        }
        if (!parsedClass.methods) {
            return false;
        }
        for (const method of parsedClass.methods) {
            if (method.method_name === methodName) {
                return true;
            }
        }
        return false;
    }


    // scrapeJacocoTable(htmlFilePathTable: string): number[][] {
    //     // Read the HTML file
    //     const htmlContent = fs.readFileSync(htmlFilePathTable, 'utf-8');
        
    //     // Parse HTML content using jsdom
    //     const dom = new JSDOM(htmlContent);
    //     const document = dom.window.document;
        
    //     // Find the table with the specified class
    //     const table = document.querySelector('table.coverage');
    
    //     // Find all the rows in the table body
    //     const rows = table.querySelectorAll('tbody tr');
    
    //     // Store rows and their coverage values
    //     const coverage: CoverageData[] = [];
    
    //     for (const row of rows) {
    //         // Extract the coverage values from the row
    //         // skip if instruction_coverage and branch_coverage is not found or error
    //         try {
    //             const instructionCoverage = parseInt(row.querySelector('td.ctr2').textContent.trim('%'), 10);
    //             const branchCoverage = parseInt(row.querySelectorAll('td.ctr2')[1].textContent.trim('%'), 10);
    //             const averageCoverage = (instructionCoverage + branchCoverage) / 2;
    
    //             coverage.push({
    //                 method_name: row.querySelector('td').textContent.trim(),
    //                 average_coverage: averageCoverage
    //             });
    //         } catch (error) {
    //             continue;
    //         }
    //     }
    
    //     // Sort the data based on increasing average coverage values
    //     const sortedData = coverage.sort((a, b) => a.average_coverage - b.average_coverage);
    
    //     let pagePath = path.join(PROJECT_FOLDER, "src", "main", "java", ...("org.jfree.chart.renderer.xy".split(".")), "XYDifferenceRenderer.java");
        

        
    //     return mtd;
    // }
}